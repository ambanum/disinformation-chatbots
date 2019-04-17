const config = require('config');
const Twitter = require('twit');

const graph = require('./graph');
const botometer = require('./botometer');
const utils = require('./utils');

const T = new Twitter({
	consumer_key: config.get('hooks.botometerAnalyser.twitter.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.twitter.consumer_secret'),
	access_token: config.get('hooks.botometerAnalyser.twitter.access_token'),
	access_token_secret: config.get('hooks.botometerAnalyser.twitter.access_token_secret')
});

function lastDaysTweets(tweets, nbDay) {
	const now = new Date().getTime();
	const before = now - (nbDay * 24 * 3600 * 1000);
	return tweets.filter(tweet => before - new Date(tweet.created_at) < 0);
}
async function analyse(searchedTerm) {
	try {
		const twitterParams = {
			count: 100,
			q: searchedTerm,
		};

		// Get tweets containing the search param
		const response = await T.get('search/tweets', twitterParams);
		const tweets = response.data.statuses;

		// If there is no search results, nothing to do
		if (!tweets.length) {
			console.log(`No results found on Twitter for the search ${searchedTerm}`);
			return null;
		}

		// Filter tweets to keep only the recents ones, according to the config
		const nbDay = config.get('hooks.botometerAnalyser.nbDay');
		let filteredTweets = lastDaysTweets(tweets, nbDay);
		let users = filteredTweets.map(tweet => tweet.user.screen_name);

		// Until it will be faster, we limit getting botometer score to the n first users
		const maxAccountToAnalyse = config.get('hooks.botometerAnalyser.maxAccountToAnalyse');
		console.log(`Limit botometer score to ${maxAccountToAnalyse} first users`);
		users = users.slice(0, maxAccountToAnalyse);
		filteredTweets = filteredTweets.slice(0, maxAccountToAnalyse);

		// Get botometer scores
		const { scores, uniqueUsersScores } = await botometer.getScores(users);
		const sharesPercentage = utils.percentagesBotHuman(scores);
		const usersPercentage = utils.percentagesBotHuman(uniqueUsersScores);

		console.log(`In the last ${nbDay > 1 ? `${nbDay} days` : 'day'}`);
		console.log('Number of tweets containing this search:', filteredTweets.length);
		console.log('Number of users:', users.length);

		// Generate graph
		const imageFileName = await graph.generateFromScores(uniqueUsersScores, scores);

		return {
			shares: {
				total: filteredTweets.length,
				percentageUnknown: 100 - (sharesPercentage.percentageBot + sharesPercentage.percentageHuman),
				percentageBot: sharesPercentage.percentageBot,
				percentageHuman: sharesPercentage.percentageHuman,
			},
			users: {
				total: users.length,
				percentageUnknown: 100 - (usersPercentage.percentageBot + usersPercentage.percentageHuman),
				percentageBot: usersPercentage.percentageBot,
				percentageHuman: usersPercentage.percentageHuman,
			},
			imageUrl: imageFileName
		};
	} catch (e) {
		console.error(e);
	}
}

module.exports = {
	analyse,
	lastDaysTweets
};
