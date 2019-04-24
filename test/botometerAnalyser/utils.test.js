const config = require('config');
const { expect } = require('chai');
const utils = require('../../botometerAnalyser/utils');

describe('BotometerAnalyser utils', () => {
	describe('#percentageBetweenValues', () => {
		context('with no scores', () => {
			it('should count no values', () => {
				expect(utils.percentageBetweenValues([], 1, 4)).to.equal(0);
			});
		});

		context('with no scores between values', () => {
			it('should count no values', () => {
				expect(utils.percentageBetweenValues([0.1, 0.2, 0.3, 4.1, 4.2], 1, 4)).to.equal(0);
			});
		});

		context('with scores between values', () => {
			context('and no scores equal to boundaries', () => {
				it('should count all values between given min and max', () => {
					expect(utils.percentageBetweenValues([0.1, 1.2, 2.3, 3.1, 4.2, 4.8], 1, 4)).to.equal(50);
				});
			});

			context('and a score equals to min boundary', () => {
				it('should count all values between given min and max, including min', () => {
					expect(utils.percentageBetweenValues([0.1, 1, 2.3, 3.1, 4.2, 4.8], 1, 4)).to.equal(50);
				});
			});

			context('and a score equals to max boundary', () => {
				it('should count all values between given min and max, excluding max', () => {
					expect(utils.percentageBetweenValues([0.1, 1.2, 2.3, 3.1, 4, 4.8], 1, 4)).to.equal(50);
				});
			});
		});
	});

	describe('#percentagesBotHuman', () => {
		context('with no scores', () => {
			it('should count no values', () => {
				expect(utils.percentagesBotHuman([])).to.deep.equal({
					percentageBot: 0,
					percentageHuman: 0
				});
			});
		});

		context('with neither bots or humans scores', () => {
			it('should count no values', () => {
				expect(utils.percentagesBotHuman([1.1, 1.9, 1.1, 3, 3.1, 3.2])).to.deep.equal({
					percentageBot: 0,
					percentageHuman: 0
				});
			});
		});

		context('with bots scores and no humans scores', () => {
			it('should count only bots', () => {
				expect(utils.percentagesBotHuman([1.1, 1.9, 1.1, 3, 4.1, 4.2])).to.deep.equal({
					percentageBot: 33,
					percentageHuman: 0
				});
			});

			context('with bots score equal to boundary', () => {
				it('should count score equal to bot boundary', () => {
					expect(utils.percentagesBotHuman([1.1, 1.9, 1.1, 3, config.get('hooks.botometerAnalyser.minScoreBot'), 4.2])).to.deep.equal({
						percentageBot: 33,
						percentageHuman: 0
					});
				});
			});
		});

		context('with humans scores and no bots scores', () => {
			it('should count only humans', () => {
				expect(utils.percentagesBotHuman([0.1, 0.9, 1.1, 3, 3.1, 3.2])).to.deep.equal({
					percentageBot: 0,
					percentageHuman: 33
				});
			});

			context('with human score equal to boundary', () => {
				it('should not count score equal to human boundary', () => {
					expect(utils.percentagesBotHuman([0.1, config.get('hooks.botometerAnalyser.maxScoreHuman'), 1.1, 3, 3.1, 3.2])).to.deep.equal({
						percentageBot: 0,
						percentageHuman: 17
					});
				});
			});
		});

		context('with both humans and bots scores', () => {
			it('should count both', () => {
				expect(utils.percentagesBotHuman([0.1, 0.9, 1.1, 3, 4.1, 4.2])).to.deep.equal({
					percentageBot: 33,
					percentageHuman: 33
				});
			});
		});
	});

	describe('#percentageOfScoreByRange', () => {
		context('with no scores', () => {
			it('should count no values', () => {
				expect(utils.percentageOfScoreByRange([])).to.deep.equal([
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0
				]);
			});
		});

		context('with scores equal to boundaries', () => {
			context('min boundary', () => {
				it('should count scores in the first range step', () => {
					expect(utils.percentageOfScoreByRange([config.get('hooks.botometerAnalyser.minScore')])).to.deep.equal([
						100, 0, 0, 0, 0, 0, 0, 0, 0, 0
					]);
				});
			});

			context('max boundary', () => {
				it('should count scores in the last range step', () => {
					expect(utils.percentageOfScoreByRange([config.get('hooks.botometerAnalyser.maxScore')])).to.deep.equal([
						0, 0, 0, 0, 0, 0, 0, 0, 0, 100
					]);
				});
			});
		});

		context('with a score for each step', () => {
			it('should count scores distributed on each step', () => {
				expect(utils.percentageOfScoreByRange([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])).to.deep.equal([
					10, 10, 10, 10, 10, 10, 10, 10, 10, 10
				]);
			});
		});

		context('with mixed scores', () => {
			it('should count scores according to each step', () => {
				expect(utils.percentageOfScoreByRange([0, 0.9, 1.2, 1.9, 2.1, 2.3, 3.1, 3.4, 4.2, 4.3])).to.deep.equal([
					10, 10, 10, 10, 20, 0, 20, 0, 20, 0
				]);
			});
		});
	});

	describe('#rangeLabel', () => {
		context('with default config', () => {
			it('should return a label for each step', () => {
				expect(utils.rangeLabel()).to.deep.equal([
					0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
				]);
			});
		});

		context('with custom config', () => {
			it('should return a label for each step', () => {
				config.hooks.botometerAnalyser.range = 0.75;
				config.hooks.botometerAnalyser.maxScore = 6;
				expect(utils.rangeLabel()).to.deep.equal([
					0, 0.75, 1.5, 2.25, 3, 3.75, 4.5, 5.25, 6
				]);
			});
		});
	});
});
