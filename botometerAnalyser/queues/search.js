const Bull = require('bull');
const d = require('debug');

const config = require('config');
const twitter = require('../twitter');
const queryText = require('../queryText');
const cache = require('../cache');

const debug = d('BotometerAnalyser:botometer:debug');


const searchQueueOptions = {
	limiter: {
		max: config.get('hooks.botometerAnalyser.twitter.rateLimits.SEARCH_TWEETS'),
		duration: config.get('hooks.botometerAnalyser.twitter.rateLimits.TIME_WINDOW')
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};
if (process.env.NODE_ENV === 'test') {
	searchQueueOptions.redis = { db: 1 };
}
const searchQueue = new Bull('Twitter: GET search/tweets', searchQueueOptions);

function search(searchTerm) {
	const twitterParams = {
		q: searchTerm,
		count: 100,
	};
	return twitter.T.get('search/tweets', twitterParams);
}

searchQueue.process(async (job) => {
	try {
		return search(job.data.search);
	} catch (e) {
		console.error(e);
	}
});


async function onTwitterSearchCompleted(job, result) {
	try {
		const { search, responseUrl, requesterUsername } = job.data;
		const tweets = result.data.statuses;
		debug(`Twitter search "${search}" job completed, found ${tweets.length} results`);

		// If there is no search results, nothing to do
		if (!tweets.length) {
			debug(`No results found on Twitter for the search ${search}`);
			return request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Nobody shared "${search}" on Twitter in the last 7 days`,
					response_type: 'in_channel'
				},
			});
		}

		const users = tweets.map(tweet => ({ screenName: tweet.user.screen_name, id: tweet.user.id_str }));
		const unscoredUsers = users.filter(user => !cache.getUserById(user.id));

		debug(`Found ${users.length} users with ${unscoredUsers.length} not already in the cache`);

		await queryText.scheduleUsersAnalysis({
			search,
			responseUrl,
			requesterUsername,
			users,
			unscoredUsers
		});
	} catch (e) {
		console.error(e);
	}
}

searchQueue.on('completed', onTwitterSearchCompleted);

module.exports = {
	searchQueue,
	onTwitterSearchCompleted,
};
