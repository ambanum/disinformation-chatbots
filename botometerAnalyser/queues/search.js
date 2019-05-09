const Bull = require('bull');
const config = require('config');

const { T } = require('../apis/twitter');


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
	return T.get('search/tweets', twitterParams);
}

searchQueue.process(async (job) => {
	try {
		return search(job.data.search);
	} catch (e) {
		console.error(e);
	}
});


module.exports = {
	searchQueue,
};
