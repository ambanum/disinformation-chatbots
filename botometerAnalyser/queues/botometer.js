const Bull = require('bull');
const d = require('debug');
const config = require('config');

const { B } = require('../apis/botometer');

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

const botometerQueue = new Bull('Botometer: getScore', queueOptions);


botometerQueue.process(async (job) => {
	try {
		const { userId } = job.data;
		debug('Start job', userId);
		return B.getBotScore({ userId });
	} catch (error) {
		logError(error);
		return null;
	}
});


module.exports = {
	botometerQueue,
};
