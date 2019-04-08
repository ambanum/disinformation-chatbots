const config = require('config');

function percentages(scores) {
    const percentageBot = percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScoreBot'), config.get('hooks.botometerAnalyser.maxScore'));
    const percentageHuman = percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScore'), config.get('hooks.botometerAnalyser.maxScoreHuman'));
    return {
        percentageBot,
        percentageHuman
    };
}

function percentageBetweenValues(scores, minScore, maxScore) {
    const total = scores.filter((score) => {
        if (maxScore === config.get('hooks.botometerAnalyser.maxScore')) {
            return score >= minScore;
        }
        return score >= minScore && score < maxScore;
    }).length;
    return Math.round(total / scores.length * 100);
};

function percentageOfUserByScoreRange(scores) {
    let stepMin = 0;
    let stepMax = config.get('hooks.botometerAnalyser.range');
    let result = [];
    while (stepMax <= config.get('hooks.botometerAnalyser.maxScore')) {
        result.push(percentageBetweenValues(scores, stepMin, stepMax));
        stepMin += config.get('hooks.botometerAnalyser.range');
        stepMax += config.get('hooks.botometerAnalyser.range');
    };

    return result;
}

module.exports = {
    percentages,
    percentageBetweenValues,
    percentageOfUserByScoreRange,
};
