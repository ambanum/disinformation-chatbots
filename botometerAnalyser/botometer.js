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
	log_progress: true,
	include_user: false,
	include_timeline: false,
	include_mentions: false
});

// TODO: move to higher level cache managment
function getScores(users = []) {
	return new Promise((resolve) => {
		const cachedUsersScore = [];
		const unscoredUsers = [];

		users.forEach((user) => {
			const cachedUserScore = cache.getUserScore(user);
			if (typeof cachedUserScore !== 'undefined') {
				cachedUsersScore.push({
					name: user,
					score: cachedUserScore
				});
			} else {
				unscoredUsers.push(user);
			}
		});
		debug('Cached users scores', cachedUsersScore);
		debug('Unscored users', unscoredUsers);

		// Remove duplicate for botometer API request
		const uniqueUnscoredUsers = [...new Set(unscoredUsers)];

		B.getBatchBotScores(uniqueUnscoredUsers, (data) => {
			const freshUsersScores = {};
			data.forEach((d) => {
				freshUsersScores[d.botometer.user.screen_name] = d.botometer.display_scores.universal;
			});

			Object.keys(freshUsersScores).forEach((username) => {
				cache.addUserScore(username, freshUsersScores[username]);
			});

			debug('Fresh users scores', freshUsersScores);

			const allUsersScore = cachedUsersScore.concat(unscoredUsers.map(name => ({
				name,
				score: freshUsersScores[name]
			})));

			const scores = allUsersScore.map(user => user.score);
			const uniqueUsersScores = allUsersScore
				.filter((userScore, index, self) => (
					index === self.findIndex(uS => uS.name === userScore.name)))
				.map(user => user.score);

			debug('scores', scores);
			debug('uniqueUsersScores', uniqueUsersScores);

			resolve({
				scores,
				uniqueUsersScores
			});
		});
	});
}

module.exports = {
	getScores,
	B
};
