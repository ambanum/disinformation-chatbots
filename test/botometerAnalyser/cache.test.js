const config = require('config');
const { expect } = require('chai');
const fs = require('fs');
const cache = require('../../botometerAnalyser/cache');

describe('BotometerAnalyser cache', () => {
	const user1 = {
		screenName: 'testUsername',
		score: 4,
		userId: 1
	};

	const user2 = {
		screenName: 'testUsername2',
		score: 2,
		userId: 2
	};

	context('#addUser', () => {
		let json;
		context('when the user does not exist', () => {
			before(() => {
				cache.addUser(user1.screenName, user1.userId, user1.score);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});
			it('should add the user with its score', () => {
				expect(json.users.find(user => user.screenName === user1.screenName).score).to.deep.equal(user1.score);
			});
		});

		context('when the user exists', () => {
			const newScore = 3;
			before(() => {
				cache.addUser(user1.screenName, user1.userId, user1.score);
				cache.addUser(user1.screenName, user1.userId, newScore);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});
			it('should replace the user score', () => {
				expect(json.users.find(user => user.screenName === user1.screenName).score).to.deep.equal(newScore);
			});
		});

		context('with multiple users', () => {
			before(() => {
				cache.addUser(user1.screenName, user1.userId, user1.score);
				cache.addUser(user2.screenName, user2.userId, user2.score);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});

			it('should not affect the first the user score', () => {
				expect(json.users.find(user => user.screenName === user1.screenName).score).to.deep.equal(user1.score);
			});

			it('should properly add the second user with its score', () => {
				expect(json.users.find(user => user.screenName === user2.screenName).score).to.deep.equal(user2.score);
			});
		});
	});

	context('#getUserById', () => {
		before(() => {
			cache.addUser(user1.screenName, user1.userId, user1.score);
		});

		context('when the user does not exist', () => {
			it('should return nothing', () => {
				expect(cache.getUserById('sbrada')).to.equal(undefined);
			});
		});

		context('when the user exists', () => {
			it('should return the proper score', () => {
				expect(cache.getUserById(user1.userId)).to.deep.equal(user1);
			});
		});

		context('with multiple users', () => {
			before(() => {
				cache.addUser(user1.screenName, user1.userId, user1.score);
				cache.addUser(user2.screenName, user2.userId, user2.score);
			});

			it('should return the proper score', () => {
				expect(cache.getUserById(user2.userId)).to.deep.equal(user2);
			});
		});
	});
});
