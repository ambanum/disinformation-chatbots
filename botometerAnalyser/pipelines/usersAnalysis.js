const config = require('config');
const d = require('debug');

const utils = require('../utils');
const cache = require('../cache');
const graph = require('../graph');
const { botometerQueue } = require('../queues/botometer');

const logError = d('BotometerAnalyser:queryText:error');
const debug = d('BotometerAnalyser:queryText:debug');


async function scheduleUsersAnalysis({
	users, callerCallback, callerData
}) {
	const unscoredUsers = users.filter(user => !cache.getUser(user));

	debug(`Found ${users.length} users with ${unscoredUsers.length} not already in the cache`);

	const promises = [];
	const startTimestamp = new Date().getTime();

	if (!unscoredUsers.length) {
		await answer({ callerData,	callerCallback,	users });
		return;
	}

	unscoredUsers.forEach((user) => {
		// When there are multiple tweets from the same user, it's possible that its score have already been got.
		if (cache.getUser(user)) {
			return;
		}

		promises.push(botometerQueue.add({
			user,
			startTimestamp,
			users,
			unscoredUsers,
			callerCallback,
			callerData,
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


botometerQueue.on('completed', botometerOnCompleted);


async function botometerOnCompleted(job, botometerScore) {
	try {
		const {
			user,
			startTimestamp,
			users,
			unscoredUsers,
			callerCallback,
			callerData,
		} = job.data;

		debug(`Botometer job for user ${user.screenName} completed`);

		if (!botometerScore) {
			debug(`Add in the cache user without score: ${user}`);
			cache.addUser(user.screenName, user.userId, 'NA');
		} else {
			debug(`Add in the cache user with score: ${botometerScore.user.screen_name}, ${botometerScore.user.id_str}, ${botometerScore.botometer.display_scores.universal}`);
			cache.addUser(botometerScore.user.screen_name, botometerScore.user.id_str, botometerScore.botometer.display_scores.universal);
		}

		const stillUnscoredUsers = unscoredUsers.filter(user => !cache.getUser(user));
		debug('Remaining users to be scored for this search', stillUnscoredUsers.length);

		const isTimeoutExpired = new Date() >= new Date(startTimestamp + config.get('hooks.botometerAnalyser.timeout'));

		if (!stillUnscoredUsers.length || isTimeoutExpired) {
			debug(`Users remaining to score: ${stillUnscoredUsers.length}, is timeout expired? ${isTimeoutExpired}`);
			debug(`Botometer analyser: Job (${job.timestamp}, ${job.id}) completed for analysis "${callerData}"`);

			await answer({ users, callerCallback, callerData });
		}
	} catch (error) {
		logError(error);
	}
}


async function answer({ users, callerCallback, callerData }) {
	const analysis = await analyseUsersScores(users);

	await callerCallback({ callerData, analysis });
}


async function analyseUsersScores(users = []) {
	// Get all users relate to the requester's search from cache
	const cachedUsers = users.map(user => cache.getUser(user)).filter(user => !!user);
	// Uniquify this array
	const uniquedCachedUsers = cachedUsers.filter((user, position, array) => array.map(user => user.screenName).indexOf(user.screenName) === position);

	const scores = cachedUsers.map(user => user.score);
	const uniqueUsersScores = uniquedCachedUsers.map(user => user.score);

	const sharesPercentage = utils.percentagesBotHuman(scores);
	const usersPercentage = utils.percentagesBotHuman(uniqueUsersScores);

	let imageFileName;
	if (users.length) {
		imageFileName = await graph.generateFromScores(uniqueUsersScores, scores);
	}

	return {
		shares: {
			total: cachedUsers.length,
			percentageUnknown: 100 - (sharesPercentage.percentageBot + sharesPercentage.percentageHuman),
			percentageBot: sharesPercentage.percentageBot,
			percentageHuman: sharesPercentage.percentageHuman,
		},
		users: {
			total: uniquedCachedUsers.length,
			percentageUnknown: 100 - (usersPercentage.percentageBot + usersPercentage.percentageHuman),
			percentageBot: usersPercentage.percentageBot,
			percentageHuman: usersPercentage.percentageHuman,
		},
		imageUrl: imageFileName
	};
}


module.exports = {
	scheduleUsersAnalysis,
	analyseUsersScores,
};
