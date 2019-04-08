const debug = require('debug')('index');
const config = require('config');
const Botometer = require('node-botometer');
const cache = require('./cache.js');

const B = new Botometer({
    consumer_key: config.get('hooks.botometerAnalyser.botometer.consumer_key'),
    consumer_secret: config.get('hooks.botometerAnalyser.botometer.consumer_secret'),
    access_token_key: config.get('hooks.botometerAnalyser.botometer.access_token_key'),
    access_token_secret: config.get('hooks.botometerAnalyser.botometer.access_token_secret'),
    app_only_auth: true,
    mashape_key: config.get('hooks.botometerAnalyser.botometer.mashape_key'),
    rate_limit: 0,
    log_progress: false,
    include_user: true,
    include_timeline: false,
    include_mentions: false
});

function getScores(users) {
    return new Promise((resolve, reject) => {
        const cachedUsersScore = [];
        const unscoredUsers = [];

        users.forEach((user) => {
            const cachedUserScore = cache.getUserScore(user);
            if (typeof cachedUserScore !== 'undefined') {
                cachedUsersScore.push({
                    name: user,
                    score: cachedUserScore
                })
            } else {
                unscoredUsers.push(user)
            }
        });
        debug('Cached users scores', cachedUsersScore);
        debug('Unscored users', unscoredUsers);

        // Remove duplicate for botometer API request
        const uniqueUnscoredUsers = [...new Set(unscoredUsers)];

        B.getBatchBotScores(uniqueUnscoredUsers, data => {
            const freshUsersScores = data.map((d) => {
                return {
                    name: d.user.screen_name,
                    score: d.botometer.display_scores.universal
                }
            });
            
            freshUsersScores.forEach(userScore => {
                cache.addUserScore(userScore.name, userScore.score);
            });
            debug('Fresh users scores', freshUsersScores);

            allUsersScore = cachedUsersScore.concat(freshUsersScores);
            allUsersScore.forEach(userScore => {
                cache.addUserScore(userScore.name, userScore.score);
            });

            const scores = allUsersScore.map((user) => user.score);
            const uniqueUserScores = allUsersScore
                .filter((userScore, index, self) => index === self.findIndex((uS) => uS.name === userScore.name))
                .map((user) => user.score);

            debug('scores', scores);
            debug('uniqueUserScores', uniqueUserScores);

            resolve({
                scores,
                uniqueUserScores 
            });
        });
    });
}

module.exports = {
    getScores
};