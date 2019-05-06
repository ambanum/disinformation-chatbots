const Bull = require('bull');
const d = require('debug');

const config = require('config');

const debug = d('BotometerAnalyser:botometer:debug');
const logError = d('BotometerAnalyser:botometer:error');


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

module.exports = {
	queue,
};
