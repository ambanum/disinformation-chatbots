const config = require('config');

function percentageBetweenValues(scores = [], minScore, maxScore) {
	const total = scores.filter((score) => {
		if (maxScore === config.get('hooks.botometerAnalyser.maxScore')) {
			return score >= minScore;
		}
		return score >= minScore && score < maxScore;
	}).length;
	return !total ? 0 : Math.round(total / scores.length * 100);
}

function percentagesBotHuman(scores) {
	const percentageBot = percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScoreBot'), config.get('hooks.botometerAnalyser.maxScore'));
	const percentageHuman = percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScore'), config.get('hooks.botometerAnalyser.maxScoreHuman'));
	return {
		percentageBot,
		percentageHuman
	};
}

function percentageOfScoreByRange(scores) {
	let stepMin = config.get('hooks.botometerAnalyser.minScore');
	let stepMax = config.get('hooks.botometerAnalyser.range');
	const result = [];
	while (stepMax <= config.get('hooks.botometerAnalyser.maxScore')) {
		result.push(percentageBetweenValues(scores, stepMin, stepMax));
		stepMin += config.get('hooks.botometerAnalyser.range');
		stepMax += config.get('hooks.botometerAnalyser.range');
	}

	return result;
}

function rangeLabel() {
	let label = 0;

	const result = [label];
	const stepsCount = config.get('hooks.botometerAnalyser.maxScore') / config.get('hooks.botometerAnalyser.range');
	let actualStep = 1;

	while (actualStep <= stepsCount) {
		label += config.get('hooks.botometerAnalyser.range');
		result.push(label);
		actualStep++;
	}

	return result;
}

module.exports = {
	percentagesBotHuman,
	percentageBetweenValues,
	percentageOfScoreByRange,
	rangeLabel
};
