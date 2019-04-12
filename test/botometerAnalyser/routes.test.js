const config = require('config');
const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const app = require('../../app');
const { queue } = require('../../botometerAnalyser/queue');

const stubs = {};

describe('BotometerAnalyser routes', () => {
	describe('/botometer/', () => {
		context('with no token provided', () => {
			let response;
			before(async () => {
				stubs.add = sinon.stub(queue, 'add');
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

			it('should not add a job to the queue', () => {
				expect(stubs.add.calledOnce).to.be.false;
			});
		});

		context('with invalid token', () => {
			let response;
			before(async () => {
				stubs.add = sinon.stub(queue, 'add');
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

			it('should not add a job to the queue', () => {
				expect(stubs.add.calledOnce).to.be.false;
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
					stubs.add = sinon.stub(queue, 'add');
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
					stubs.add.restore();
				});

				it('should respond with 200', () => {
					expect(response.status).to.equal(200);
				});

				it('should respond with the searched term in the text', () => {
					expect(response.body.text).to.contain(searchTerm);
				});

				it('should respond with the max number of account in the text', () => {
					expect(response.body.text).to.contain(`${config.get('hooks.botometerAnalyser.maxAccountToAnalyse')} max`);
				});

				it('should add a job and only one to the queue', () => {
					expect(stubs.add.calledOnce).to.be.true;
				});

				it('should add a job with proper params', () => {
					expect(stubs.add.calledWith({
						search: searchTerm,
						responseUrl: 'response_url',
						requesterUsername: 'user_name'
					})).to.be.true;
				});
			});

			context('when there is already an analyse running', () => {
				let response;
				const searchTerm = 'test';

				before(async () => {
					stubs.add = sinon.stub(queue, 'add');
					stubs.getActiveCount = sinon.stub(queue, 'getActiveCount').returns('1');
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
					stubs.add.restore();
					stubs.getActiveCount.restore();
				});

				it('should respond with 200', () => {
					expect(response.status).to.equal(200);
				});

				it('should respond with the searched term in the text', () => {
					expect(response.body.text).to.contain(searchTerm);
				});

				it('should respond with the max number of account in the text', () => {
					expect(response.body.text).to.contain(`${config.get('hooks.botometerAnalyser.maxAccountToAnalyse')} max`);
				});

				it('should respond with the information that an analyse is already running in the text', () => {
					expect(response.body.text).to.contain('already an analyse running');
				});

				it('should add a second job to the queue', () => {
					expect(stubs.add.calledTwice).to.be.true;
				});
			});
		});
	});
});
