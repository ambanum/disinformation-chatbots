const { expect } = require('chai');
const sinon = require('sinon');
const queryText = require('../../botometerAnalyser/pipelines/queryText');
const usersAnalysis = require('../../botometerAnalyser/pipelines/usersAnalysis');
const searchResult = require('./fixtures/twitter/search');


describe('BotometerAnalyser queryText', () => {
	describe('#onTwitterSearchCompleted', () => {
		const stubs = {};
		before(async () => {
			stubs.scheduleUsersAnalysis = sinon.stub(usersAnalysis, 'scheduleUsersAnalysis');
			await queryText.onTwitterSearchCompleted({
				data: {
					search: 'test',
					responseUrl: 'http://mattermost-server.com',
					requesterUsername: 'ndpnt'
				}
			}, { data: searchResult });
		});

		after(() => {
			stubs.scheduleUsersAnalysis.restore();
		});
		it('should schedule a job with proper params', () => {
			expect(stubs.scheduleUsersAnalysis.getCall(0).args[0]).to.deep.equal({
				users: [
					{
						screenName: 'NASA',
						userId: '11348282',
					},
					{
						screenName: 'NASA',
						userId: '11348282',
					},
					{
						screenName: 'NASA',
						userId: '11348282',
					},
					{
						screenName: 'Astro_Kanai',
						userId: '842625693733203968',
					},
					{
						screenName: 'NASAJPL',
						userId: '19802879',
					}
				],
				analysisType: 'Query text analysis',
				context: {
					search: 'test',
					responseUrl: 'http://mattermost-server.com',
					requesterUsername: 'ndpnt',
				},
			});
		});
	});
});
