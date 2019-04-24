const Twitter = require('twit');
const config = require('config');
const Bull = require('bull');

const T = new Twitter({
	consumer_key: config.get('hooks.botometerAnalyser.twitter.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.twitter.consumer_secret'),
	access_token: config.get('hooks.botometerAnalyser.twitter.access_token'),
	access_token_secret: config.get('hooks.botometerAnalyser.twitter.access_token_secret')
});

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
	return T.get('users/show', twitterParams);
}

getUserQueue.process(async (job) => {
	try {
		return getUser(job.data.userId);
	} catch (e) {
		console.error(e);
	}
});

module.exports = {
	search,
	searchQueue,
	getRetweetersIds,
	retweetersIdsQueue,
	getUser,
	getUserQueue,
};
