const { expect } = require('chai');
const cache = require('../../botometerAnalyser/cache');
const usersAnalysis = require('../../botometerAnalyser/pipelines/usersAnalysis');

const usersWithoutDuplicates = [
	{ screenName: 'user1', userId: '1' },
	{ screenName: 'user2', userId: '2' },
	{ screenName: 'user3', userId: '3' },
	{ screenName: 'user4', userId: '4' },
	{ screenName: 'user5', userId: '5' }
];

const usersWithDuplicates = [...usersWithoutDuplicates, usersWithoutDuplicates[2]];

const userIdsWithoutDuplicates = usersWithoutDuplicates.map(user => user.userId);
const userIdsWithDuplicates = usersWithDuplicates.map(user => user.userId);

const scores = {
	user1: 0.5,
	user2: 0.8,
	user3: 2,
	user4: 4,
	user5: 4.5,
};

describe('BotometerAnalyser usersAnalysis', () => {
	before(() => {
		usersWithoutDuplicates.forEach(user => cache.addUser(user.screenName, user.userId, scores[user.screenName]));
	});

	describe('#analyseUsersScores', () => {
		context('with no user', () => {
			it('should return a proper empty result object', () => usersAnalysis.analyseUsersScores({ userIds: [] }).then((result) => {
				expect(result).to.deep.equal({
					shares: {
						total: 0,
						percentageUnknown: 100,
						percentageBot: 0,
						percentageHuman: 0,
					},
					users: {
						total: 0,
						percentageUnknown: 100,
						percentageBot: 0,
						percentageHuman: 0,
					},
					imageUrl: undefined
				});
			}));
		});

		context('with an array of uniqueUsers', () => {
			context('when each users tweets only one time', () => {
				let result;
				before(async () => {
					result = await usersAnalysis.analyseUsersScores({ userIds: userIdsWithoutDuplicates });
				});
				it('should return a proper shares analysis', () => {
					expect(result.shares).to.deep.equal({
						total: 5,
						percentageUnknown: 20,
						percentageBot: 40,
						percentageHuman: 40,
					});
				});
				it('should return a proper users analysis', () => {
					expect(result.users).to.deep.equal({
						total: 5,
						percentageUnknown: 20,
						percentageBot: 40,
						percentageHuman: 40,
					});
				});
				it('should return an image filename', () => {
					expect(result.imageUrl).to.be.a.string;
				});
			});

			context('when at least a user tweets multiple times', () => {
				let result;
				before(async () => {
					result = await usersAnalysis.analyseUsersScores({ userIds: userIdsWithDuplicates });
				});
				it('should return a proper shares analysis', () => {
					expect(result.shares).to.deep.equal({
						total: 6,
						percentageUnknown: 34,
						percentageBot: 33,
						percentageHuman: 33,
					});
				});
				it('should return a proper users analysis', () => {
					expect(result.users).to.deep.equal({
						total: 5,
						percentageUnknown: 20,
						percentageBot: 40,
						percentageHuman: 40,
					});
				});
				it('should return an image filename', () => {
					expect(result.imageUrl).to.be.a.string;
				});
			});
		});
	});
});
