const Bull = require('bull');

const twitter = require('../twitter');


const getUserQueueOptions = {
	limiter: {
		max: config.get('hooks.botometerAnalyser.twitter.rateLimits.USERS_SHOW'),
		duration: config.get('hooks.botometerAnalyser.twitter.rateLimits.TIME_WINDOW')
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};
if (process.env.NODE_ENV === 'test') {
	getUserQueueOptions.redis = { db: 1 };
}
const getUserQueue = new Bull('Twitter: GET users/show', getUserQueueOptions);

function getUser(userId) {
	const twitterParams = {
		user_id: userId,
		include_entities: false
	};
	return twitter.T.get('users/show', twitterParams);
}

getUserQueue.process(async (job) => {
	try {
		return getUser(job.data.userId);
	} catch (e) {
		console.error(e);
	}
});


module.exports = {
	getUserQueue,
};
