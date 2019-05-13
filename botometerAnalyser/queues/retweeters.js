const Bull = require('bull');
const config = require('config');

const { T } = require('../apis/twitter');


const retweeterIdsQueueOptions = {
	limiter: {
		max: config.get('hooks.botometerAnalyser.twitter.rateLimits.STATUSES_RETWEETERS_IDS'),
		duration: config.get('hooks.botometerAnalyser.twitter.rateLimits.TIME_WINDOW')
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};
if (process.env.NODE_ENV === 'test') {
	retweeterIdsQueueOptions.redis = { db: 1 };
}
const retweeterIdsQueue = new Bull('Twitter: GET statuses/retweeters/ids', retweeterIdsQueueOptions);

retweeterIdsQueue.process(async (job) => {
	try {
		const { tweetId, cursor } = job.data;
		const twitterParams = {
			id: tweetId,
			count: 100,
			cursor,
			stringify_ids: true,
		};
		return T.get('statuses/retweeters/ids', twitterParams);
	} catch (e) {
		console.error(e);
	}
});


module.exports = {
	retweeterIdsQueue,
};
