const Bull = require('bull');
const config = require('config');

const { T } = require('../apis/twitter');


const getTweetQueueOptions = {
	limiter: {
		max: config.get('hooks.botometerAnalyser.twitter.rateLimits.STATUSES_SHOW'),
		duration: config.get('hooks.botometerAnalyser.twitter.rateLimits.TIME_WINDOW')
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};
if (process.env.NODE_ENV === 'test') {
	getTweetQueueOptions.redis = { db: 1 };
}
const getTweetQueue = new Bull('Twitter: GET statuses/show', getTweetQueueOptions);

getTweetQueue.process(async (job) => {
	try {
		return T.get('statuses/show', { id: job.data.tweetId });
	} catch (e) {
		console.error(e);
	}
});


module.exports = {
	getTweetQueue,
};
