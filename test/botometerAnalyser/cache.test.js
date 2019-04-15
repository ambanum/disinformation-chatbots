const config = require('config');
const { expect } = require('chai');
const fs = require('fs');
const cache = require('../../botometerAnalyser/cache');

describe('BotometerAnalyser cache', () => {
	const username = 'testUsername';
	const score = 4;
	const secondUsername = 'testUsername2';
	const secondScore = 2;

	context('#addUserScore', () => {
		let json;

		after(() => {
			// Ensure removing test cache file
			if (fs.existsSync(config.get('hooks.botometerAnalyser.dbFileName'))) {
				fs.unlinkSync(config.get('hooks.botometerAnalyser.dbFileName'));
			}
		});

		context('when the user does not exist', () => {
			before(() => {
				cache.addUserScore(username, score);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});
			it('should add the user with its score', () => {
				expect(json.users[username].score).to.deep.equal(score);
			});
		});

		context('when the user exists', () => {
			const newScore = 3;
			before(() => {
				cache.addUserScore(username, score);
				cache.addUserScore(username, newScore);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});
			it('should replace the user score', () => {
				expect(json.users[username].score).to.equal(newScore);
			});
		});

		context('with multiple users', () => {
			before(() => {
				cache.addUserScore(username, score);
				cache.addUserScore(secondUsername, secondScore);
				const rawdata = fs.readFileSync(config.get('hooks.botometerAnalyser.dbFileName'));
				json = JSON.parse(rawdata);
			});

			it('should not affect the first the user score', () => {
				expect(json.users[username].score).to.equal(score);
			});

			it('should properly add the second user with its score', () => {
				expect(json.users[secondUsername].score).to.equal(secondScore);
			});
		});
	});

	context('#getUserScore', () => {
		before(() => {
			cache.addUserScore(username, score);
		});
		after(() => {
			// Remove cache test file
			fs.unlinkSync(config.get('hooks.botometerAnalyser.dbFileName'));
		});

		context('when the user does not exist', () => {
			it('should return nothing', () => {
				expect(cache.getUserScore('sbrada')).to.equal(undefined);
			});
		});

		context('when the user exists', () => {
			it('should return the proper score', () => {
				expect(cache.getUserScore(username)).to.equal(score);
			});
		});

		context('with multiple users', () => {
			before(() => {
				cache.addUserScore(username, score);
				cache.addUserScore(secondUsername, secondScore);
			});

			it('should return the proper score', () => {
				expect(cache.getUserScore(secondUsername)).to.equal(secondScore);
			});
		});
	});
});
