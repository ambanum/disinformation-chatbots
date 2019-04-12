const config = require('config');
const { expect } = require('chai');
const fs = require('fs');
const sinon = require('sinon');
const botometer = require('../../botometerAnalyser/botometer');
const cache = require('../../botometerAnalyser/cache');

const botometerUserResult = {
	botometer: {
		cap: {
			english: 0.028225552221050176,
			universal: 0.009037049400998034
		},
		categories: {
			content: 0.536184832628627,
			friend: 0.07360073679258565,
			network: 0.10997006781534416,
			sentiment: 0.6846462332975961,
			temporal: 0.34186854357920926,
			user: 0.2120791504162319
		},
		display_scores: {
			content: 2.7,
			english: 1.5,
			friend: 0.4,
			network: 0.5,
			sentiment: 3.4,
			temporal: 1.7,
			universal: 0.3,
			user: 1.1
		},
		scores: {
			english: 0.3039573320934062,
			universal: 0.15881746424200632
		},
		user: {
			screen_name: 'ndpnt'
		}
	}
};

const stubs = {};

describe('BotometerAnalyser botometer', () => {
	describe('#getScores', () => {
		before(() => {
			stubs.getBatchBotScores = sinon.stub(botometer.B, 'getBatchBotScores');
			stubs.getBatchBotScores.callsArgWith(1, []);
		});

		after(() => {
			Object.keys(stubs).forEach((stubName) => {
				stubs[stubName].restore();
			});
		});

		context('without arguments', () => {
			it('should return a proper empty result object', () => botometer.getScores().then((result) => {
				expect(result).to.deep.equal({ scores: [], uniqueUsersScores: [] });
			}));
		});

		context('with an array of Twitter handles', () => {
			before(() => {
				stubs.getBatchBotScores.callsArgWith(1, [botometerUserResult]);
			});

			context('without cache', () => {
				before(() => {
					stubs.getUserScore = sinon.stub(cache, 'getUserScore');
					stubs.addUserScore = sinon.stub(cache, 'addUserScore');
				});

				after(() => {
					stubs.getUserScore.restore();
					stubs.addUserScore.restore();
				});

				context('with no duplicates', () => {
					it('should return one score and one uniqueUsersScores', () => botometer.getScores(['ndpnt']).then((result) => {
						expect(result).to.deep.equal({
							scores: [botometerUserResult.botometer.display_scores.universal],
							uniqueUsersScores: [botometerUserResult.botometer.display_scores.universal]
						});
					}));
				});

				context('with duplicates', () => {
					it('should return two scores and one unique users score', () => botometer.getScores(['ndpnt', 'ndpnt']).then((result) => {
						expect(result).to.deep.equal({
							scores: [botometerUserResult.botometer.display_scores.universal, botometerUserResult.botometer.display_scores.universal],
							uniqueUsersScores: [botometerUserResult.botometer.display_scores.universal]
						});
					}));
				});
			});

			context('with cache', () => {
				after(() => {
					// clean test cache file
					fs.unlinkSync(config.get('hooks.botometerAnalyser.dbFileName'));
				});

				context('with no duplicates', () => {
					it('should return one score and one uniqueUsersScores', () => botometer.getScores(['ndpnt']).then((result) => {
						expect(result).to.deep.equal({
							scores: [botometerUserResult.botometer.display_scores.universal],
							uniqueUsersScores: [botometerUserResult.botometer.display_scores.universal]
						});
					}));
				});

				context('with duplicates', () => {
					it('should return two scores and one uniqueUsersScores', () => botometer.getScores(['ndpnt', 'ndpnt']).then((result) => {
						expect(result).to.deep.equal({
							scores: [botometerUserResult.botometer.display_scores.universal, botometerUserResult.botometer.display_scores.universal],
							uniqueUsersScores: [botometerUserResult.botometer.display_scores.universal]
						});
					}));
				});
			});
		});
	});
});
