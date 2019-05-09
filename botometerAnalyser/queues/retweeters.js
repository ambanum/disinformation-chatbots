const Bull = require('bull');
const config = require('config');

const { T } = require('../apis/twitter');


const retweetersIdsQueueOptions = {
	limiter: {
		max: config.get('hooks.botometerAnalyser.twitter.rateLimits.STATUSES_RETWEETERS_IDS'),
		duration: config.get('hooks.botometerAnalyser.twitter.rateLimits.TIME_WINDOW')
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};
if (process.env.NODE_ENV === 'test') {
	retweetersIdsQueueOptions.redis = { db: 1 };
}
const retweetersIdsQueue = new Bull('Twitter: GET statuses/retweeters/ids', retweetersIdsQueueOptions);

function getRetweetersIds(tweetId) {
	const twitterParams = {
		id: tweetId,
		count: 100,
		stringify_ids: true,
	};
	return T.get('statuses/retweeters/ids', twitterParams);
}

retweetersIdsQueue.process(async (job) => {
	try {
		return getRetweetersIds(job.data.id);
	} catch (e) {
		console.error(e);
	}
});


module.exports = {
	retweetersIdsQueue,
};
