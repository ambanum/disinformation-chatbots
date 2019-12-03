const { expect } = require('chai');
const config = require('config');
const request = require('supertest');
const nock = require('nock');

const app = require('../../app');

describe('MediaScale routes', () => {
	describe('/media-scale/', () => {
		const apiURL = '/media-scale/';
		const validRegionCode = 'fr';
		const invalidRegionCode = 'frr';
		const notAlreadySupportedRegionCode = 'es';
		const validShares = 100000;
		const invalidShares = 'test';
		let status;
		let body;

		context('with no query params', () => {
			before(async () => {
				({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token') }));
			});

			it('responds with 200 HTTP code', () => expect(status).to.equal(200));
			it('responds with help explaining the purpose of the command', () => {
				expect(body.text).to.contain('I can help you');
				expect(body.text).to.contain('number of reactions into perspective');
			});
			it('responds with an example', () => {
				expect(body.text).to.contain('/scale fr 5617');
			});
		});

		context('with missing `region` params', () => {
			before(async () => {
				({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: validShares }));
			});

			it('responds with 200 HTTP code', () => expect(status).to.equal(200));
			it('responds with a message explaining a region code is needed', () => {
				expect(body.text).to.contain('need a region code');
			});
		});

		context('with missing `shares` params', () => {
			before(async () => {
				({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: validRegionCode }));
			});

			it('responds with 200 HTTP code', () => expect(status).to.equal(200));
			it('responds with help explaining that `shares` param is missing', () => {
				expect(body.text).to.contain('need');
				expect(body.text).to.contain('number of shares');
			});
		});

		context('with bad formatted params', () => {
			context('with wrong `region`', () => {
				before(async () => {
					({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: `${invalidRegionCode} ${validShares}` }));
				});

				it('responds with 200 HTTP code', () => expect(status).to.equal(200));
				it('responds with help explaining that `region` param is an invalid region code', () => {
					expect(body.text).to.contain('valid region code in ISO 3166-1 alpha-2 format');
				});
			});

			context('with wrong format for `shares`', () => {
				before(async () => {
					({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: `${validRegionCode} ${invalidShares}` }));
				});

				it('responds with 200 HTTP code', () => expect(status).to.equal(200));
				it('responds with help explaining that `shares` param is invalid', () => {
					expect(body.text).to.contain('valid shares number (> 0)');
				});
			});
		});

		context('with not already supported region', () => {
			before(async () => {
				({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: `${notAlreadySupportedRegionCode} ${validShares}` }));
			});

			it('responds with 200 HTTP code', () => expect(status).to.equal(200));
			it('responds with help explaining that the region is not already supported', () => {
				expect(body.text).to.contain('requested region is not already supported');
			});
		});

		context('with proper query params', () => {
			let result;
			before(async () => {
				result = {
					'Le Monde': {
						totalEngagements: '500', facebook: '440', twitter: '60', pinterest: '0', reddit: '0', date: '2017-08-29', title: 'Le Monde title', url: 'url'
					},
					Libération: {
						totalEngagements: '504', facebook: '500', twitter: '4', pinterest: '0', reddit: '0', date: '2019-01-11', title: 'Libération title', url: 'url'
					},
					'Le Figaro': {
						totalEngagements: '499', facebook: '429', twitter: '70', pinterest: '0', reddit: '0', date: '2017-11-21', title: 'Le Figaro title', url: 'url'
					},
					'Le Gorafi': {
						totalEngagements: '485', facebook: '456', twitter: '29', pinterest: '0', reddit: '0', date: '2017-05-17', title: 'Le Gorafi title', url: 'url'
					}
				};
				nock(config.get('hooks.mediaScale.baseUrl'))
					.get('/media-scale/1.0/around')
					.query(true)
					.reply(200, result);
				({ status, body } = await request(app).get(apiURL).query({ token: config.get('hooks.mediaScale.mattermost.token'), text: `${validRegionCode} ${validShares}` }));
			});

			it('responds with 200 HTTP code', () => expect(status).to.equal(200));
			it('responds in the same channel where the request comme from', () => {
				expect(body.response_type).to.be.equal('in_channel');
			});
			it('responds with message containing asked shares number', () => {
				expect(body.attachments[0].text).to.have.string(validShares);
			});
			it("responds with all newspapers' names", () => {
				const expectedNames = Object.keys(result);
				const receivedNames = [];
				body.attachments[0].fields.forEach((field) => {
					const extractedName = field.value.match(/_(.*)_/)[1];
					receivedNames.push(extractedName);
				});

				expect(expectedNames).to.have.members(receivedNames);
			});
			it("responds with all newspapers' titles", () => {
				const expectedTitles = Object.keys(result).map(key => result[key].title);
				const receivedTitles = [];
				body.attachments[0].fields.forEach((field) => {
					receivedTitles.push(field.title);
				});

				expect(receivedTitles).to.have.members(expectedTitles);
			});
			it("responds with all newspapers' publications dates", () => {
				const expectedDates = Object.keys(result).map(key => new Date(result[key].date).setHours(0, 0, 0, 0));
				const receivedDates = [];
				body.attachments[0].fields.forEach((field) => {
					const extractedDate = new Date(field.value.match(/published on (.*)$/)[1]).setHours(0, 0, 0, 0);
					receivedDates.push(extractedDate);
				});
				expect(receivedDates).to.have.members(expectedDates);
			});
		});
	});
});
