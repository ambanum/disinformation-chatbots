const { expect } = require('chai');
const index = require('../../botometerAnalyser/index');

describe('BotometerAnalyser index', () => {
	describe('#lastDaysTweets', () => {
		const now = new Date();
		const tweets = [
			{ created_at: new Date(now) },
			{ created_at: new Date(now.setDate(now.getDate() - 1)) },
			{ created_at: new Date(now.setDate(now.getDate() - 1)) },
			{ created_at: new Date(now.setDate(now.getDate() - 1)) },
			{ created_at: new Date(now.setDate(now.getDate() - 1)) },
			{ created_at: new Date(now.setDate(now.getDate() - 1)) },
		];

		it('should return tweets of the specified last days', () => {
			expect(index.lastDaysTweets(tweets, 2)).to.deep.equal(tweets.slice(0, 2));
		});
	});
});
