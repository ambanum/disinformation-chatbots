const config = require('config');
const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const nock = require('nock');

const app = require('../../app');
const queryText = require('../../botometerAnalyser/pipelines/queryText');
const botometer = require('../../botometerAnalyser/queues/botometer');

const searchResult = require('./fixtures/twitter/search');

nock('https://api.twitter.com/1.1')
	.persist()
	.get('/search/tweets.json')
	.query(true)
	.reply(200, searchResult);

const stubs = {};

describe('BotometerAnalyser routes', () => {
	describe('/botometer/', () => {
		context('with no token provided', () => {
			let response;
			before(async () => {
				stubs.add = sinon.stub(botometer.queue, 'add');
				response = await request(app)
					.get('/botometer/');
			});

			after(() => {
				stubs.add.restore();
			});

			it('should respond with 401', () => {
				expect(response.status).to.equal(401);
			});

			it('should respond an error', () => {
				expect(response.body).to.deep.equal({ Error: 'Missing or invalid token' });
			});
		});

		context('with invalid token', () => {
			let response;
			before(async () => {
				stubs.add = sinon.stub(botometer.queue, 'add');
				response = await request(app)
					.get('/botometer/')
					.query({ token: 'value' });
			});

			after(() => {
				stubs.add.restore();
			});

			it('should respond with 401', () => {
				expect(response.status).to.equal(401);
			});

			it('should respond an error', () => {
				expect(response.body).to.deep.equal({ Error: 'Missing or invalid token' });
			});
		});

		context('with valid token', () => {
			context('without search param', () => {
				let response;
				before(async () => {
					response = await request(app)
						.get('/botometer/')
						.query({ token: config.get('hooks.botometerAnalyser.mattermost.token') });
				});

				it('should respond with 200', () => {
					expect(response.status).to.equal(200);
				});

				it('should respond help text with an example', () => {
					expect(response.body.text).to.contain('help', 'For example: \n`/botometer disinformation`');
				});

				it('should not add a job to the queue', () => {
					expect(stubs.add.calledOnce).to.be.false;
				});
			});

			context('with search param', () => {
				let response;
				const searchTerm = 'test';
				before(async () => {
					stubs.scheduleUsersAnalysis = sinon.stub(queryText, 'scheduleUsersAnalysis');
					response = await request(app)
						.get('/botometer/')
						.query({
							token: config.get('hooks.botometerAnalyser.mattermost.token'),
							text: searchTerm,
							response_url: 'response_url',
							user_name: 'user_name'
						});
				});

				after(() => {
					stubs.scheduleUsersAnalysis.restore();
				});

				it('should respond with 200', () => {
					expect(response.status).to.equal(200);
				});

				it('should respond with the searched term in the text', () => {
					expect(response.body.text).to.contain(searchTerm);
				});

				it('should respond with the max number of account in the text', () => {
					expect(response.body.text).to.contain('100 accounts max');
				});
			});

			context('when there is already an analysis running', () => {
				let response;
				const searchTerm = 'test';

				before(async () => {
					stubs.scheduleUsersAnalysis = sinon.stub(queryText, 'scheduleUsersAnalysis');
					stubs.getActiveCount = sinon.stub(botometer.queue, 'getActiveCount').returns('1');
					await request(app)
						.get('/botometer/')
						.query({
							token: config.get('hooks.botometerAnalyser.mattermost.token'),
							text: searchTerm
						});
					response = await request(app)
						.get('/botometer/')
						.query({
							token: config.get('hooks.botometerAnalyser.mattermost.token'),
							text: searchTerm
						});
				});

				after(() => {
					stubs.scheduleUsersAnalysis.restore();
					stubs.getActiveCount.restore();
				});

				it('should respond with 200', () => {
					expect(response.status).to.equal(200);
				});

				it('should respond with the searched term in the text', () => {
					expect(response.body.text).to.contain(searchTerm);
				});

				it('should respond with the information that an analysis is already running in the text', () => {
					expect(response.body.text).to.contain('already running an analysis');
				});
			});
		});
	});
});
