const config = require('config');
const Botometer = require('node-botometer');
const Bull = require('bull');
const d = require('debug');

const cache = require('./cache');

const debug = d('BotometerAnalyser:botometer:debug');
const logError = d('BotometerAnalyser:botometer:error');

const B = new Botometer({
	consumer_key: config.get('hooks.botometerAnalyser.botometer.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.botometer.consumer_secret'),
	access_token_key: config.get('hooks.botometerAnalyser.botometer.access_token_key'),
	access_token_secret: config.get('hooks.botometerAnalyser.botometer.access_token_secret'),
	app_only_auth: true,
	mashape_key: config.get('hooks.botometerAnalyser.botometer.mashape_key'),
	rate_limit: 0,
	log_progress: true,
	include_user: true,
	include_timeline: false,
	include_mentions: false
});

const queueOptions = {
	limiter: {
		max: 1,
		duration: 1000,
		bounceBack: true,
	},
	defaultJobOptions: {
		removeOnComplete: true
	}
};

if (process.env.NODE_ENV === 'test') {
	debug('Queue set for TEST env');
	queueOptions.redis = { db: config.get('hooks.botometerAnalyser.redisDB') };
}

const queue = new Bull('Botometer: getScore', queueOptions);

function getBotScore(userScreenName) {
	try {
		return B.getBotScore(userScreenName);
	} catch (error) {
		logError(error);
		return null;
	}
}

queue.process(async (job) => {
	try {
		const { screenName } = job.data.user;
		debug('Start job', screenName);
		return getBotScore(screenName);
	} catch (error) {
		logError(error);
		return null;
	}
});

async function scheduleUsersAnalysis({
	search, responseUrl, requesterUsername, users, unscoredUsers
}) {
	const promises = [];
	const startTimestamp = new Date().getTime();
	unscoredUsers.forEach((user) => {
		// When there are multiple tweets from the same user, it's possible that its score have already been got.
		if (cache.getUserById(user.id)) {
			return;
		}

		promises.push(queue.add({
			search,
			responseUrl,
			requesterUsername,
			users,
			unscoredUsers,
			user,
			startTimestamp
		}, {
			// Make theses Botometer jobs prioritary
			priority: 1
		}));
	});

	const jobs = await Promise.all(promises);
	// We consider the timeout started since the startTimestamp date
	// so remove the elapsed time between startTimestamp and now from the timeout
	const durationTimeout = config.get('hooks.botometerAnalyser.timeout') - (new Date() - startTimestamp);
	setTimeout(() => {
		// Remove all jobs after timeout expired
		jobs.forEach((job) => {
			debug('Remove job', job.id, job.data.user.screenName, job.timestamp);
			job.remove().catch(logError);
		});
	}, durationTimeout);
}

module.exports = {
	getBotScore,
	queue,
	B,
	scheduleUsersAnalysis
};
