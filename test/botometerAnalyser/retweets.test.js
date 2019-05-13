const { expect } = require('chai');
const sinon = require('sinon');
const retweets = require('../../botometerAnalyser/pipelines/retweets');
const usersAnalysis = require('../../botometerAnalyser/pipelines/usersAnalysis');


describe('BotometerAnalyser retweets', () => {
	describe('#onRetweetersCompleted', () => {
		const stubs = {};
		before(async () => {
			stubs.scheduleUsersAnalysis = sinon.stub(usersAnalysis, 'scheduleUsersAnalysis');
			await retweets.onRetweetersCompleted({
				data: {
					screenName: 'twitterTestUser',
					tweet: { sometweet: 42 },
					tweetId: '123456',
					responseUrl: 'http://mattermost-server.com',
					requesterUsername: 'michelbl'
				}
			}, { data: { ids: ['45', '62'] } });
		});

		after(() => {
			stubs.scheduleUsersAnalysis.restore();
		});
		it('should schedule a job with proper params', () => {
			expect(stubs.scheduleUsersAnalysis.getCall(0).args[0]).to.deep.equal({
				users: [
					{
						userId: '45',
					},
					{
						userId: '62',
					},
				],
				analysisType: 'Retweet analysis',
				context: {
					tweet: { sometweet: 42 },
					screenName: 'twitterTestUser',
					responseUrl: 'http://mattermost-server.com',
					requesterUsername: 'michelbl',
				},
			});
		});
	});
});
