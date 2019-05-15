const request = require('request-promise');
const config = require('config');
const d = require('debug');

const utils = require('../utils');
const cache = require('../cache');
const graph = require('../graph');
const { botometerQueue } = require('../queues/botometer');

const logError = d('BotometerAnalyser:queryText:error');
const debug = d('BotometerAnalyser:queryText:debug');


const RETWEET_ANALYSIS = 'Retweet analysis';
const TEXT_SEARCH_ANALYSIS = 'Text search analysis';


async function scheduleUsersAnalysis({
	userIds, analysisType, context
}) {
	const uniqueUserIds = [...new Set(userIds)];
	const unscoredUserIds = uniqueUserIds.filter(userId => !cache.getUserById(userId));

	debug(`Found ${uniqueUserIds.length} unique users with ${unscoredUserIds.length} not already in the cache`);

	const promises = [];
	const startTimestamp = new Date().getTime();

	if (!unscoredUserIds.length) {
		await answer({ userIds, analysisType, context });
		return;
	}

	unscoredUserIds.forEach((userId) => {
		// When there are multiple tweets from the same user, it's possible that its score have already been got.
		if (cache.getUserById(userId)) {
			return;
		}

		promises.push(botometerQueue.add({
			userId,
			startTimestamp,
			userIds,
			unscoredUserIds,
			analysisType,
			context,
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
			debug('Remove job', job.id, job.data.userId, job.timestamp);
			job.remove().catch(logError);
		});
	}, durationTimeout);
}


botometerQueue.on('completed', botometerOnCompleted);


async function botometerOnCompleted(job, botometerScore) {
	try {
		const {
			userId,
			startTimestamp,
			userIds,
			unscoredUserIds,
			analysisType,
			context,
		} = job.data;

		debug(`Botometer job for user ${userId} completed`);

		if (!botometerScore) { // TODO: test in the botometer job
			debug(`Add in the cache user without score: ${userId}`);
			cache.addUser(undefined, userId, 'NA');
		} else {
			debug(`Add in the cache user with score: ${botometerScore.user.screen_name}, ${botometerScore.user.id_str}, ${botometerScore.botometer.display_scores.universal}`);
			cache.addUser(botometerScore.user.screen_name, botometerScore.user.id_str, botometerScore.botometer.display_scores.universal);
		}

		const stillUnscoredUsers = unscoredUserIds.filter(userId => !cache.getUserById(userId));
		debug('Remaining users to be scored for this search', stillUnscoredUsers.length);

		const isTimeoutExpired = new Date() >= new Date(startTimestamp + config.get('hooks.botometerAnalyser.timeout'));

		if (!stillUnscoredUsers.length || isTimeoutExpired) {
			debug(`Users remaining to score: ${stillUnscoredUsers.length}, is timeout expired? ${isTimeoutExpired}`);
			debug(`Botometer analyser: Job (${job.timestamp}, ${job.id}) completed for analysis "${context}"`);

			await answer({ userIds, analysisType, context });
		}
	} catch (error) {
		logError(error);
	}
}


async function answer({ userIds, analysisType, context }) {
	const analysis = await analyseUsersScores({ userIds });

	if (analysisType === TEXT_SEARCH_ANALYSIS) {
		await answerTextSearchAnalysis({ context, analysis });
	}
	if (analysisType === RETWEET_ANALYSIS) {
		await answerRetweetAnalysis({ context, analysis });
	}
}


async function analyseUsersScores({ userIds }) {
	// Get all users relate to the requester's search from cache
	const cachedUsers = userIds.map(userId => cache.getUserById(userId)).filter(user => !!user);
	// Uniquify this array
	const uniquedCachedUsers = cachedUsers.filter((user, position, array) => array.map(user => user.userId).indexOf(user.userId) === position);

	const scores = cachedUsers.map(user => user.score);
	const uniqueUsersScores = uniquedCachedUsers.map(user => user.score);

	const sharesPercentage = utils.percentagesBotHuman(scores);
	const usersPercentage = utils.percentagesBotHuman(uniqueUsersScores);

	let imageFileName;
	if (userIds.length) {
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


async function answerTextSearchAnalysis({ context, analysis }) {
	const { search, requesterUsername, responseUrl } = context;

	request({
		url: responseUrl,
		method: 'POST',
		json: {
			text: `@${requesterUsername} Done!`,
			response_type: 'in_channel',
			attachments: [
				{
					title: 'During the last 7 days',
					fields: [
						{
							short: false,
							title: `On the latest ${analysis.shares.total} shares of "${search}":`,
							value: `**${analysis.shares.percentageBot}%** have a high probability to be made by bots\n**${analysis.shares.percentageHuman}%** have a high probability to be made by humans\nFor the remaining **${analysis.shares.percentageUnknown}%** it's difficult to say`
						},
						{
							short: false,
							title: `On the ${analysis.users.total} users who have written content that contains "${search}":`,
							value: `**${analysis.users.percentageBot}%** have a high probability to be bots\n**${analysis.users.percentageHuman}%** have a high probability to be humans\nFor the remaining **${analysis.users.percentageUnknown}%** it's difficult to say`
						},
					],
				},
				{
					title: 'Here is the distribution',
					title_link: `${config.get('hooks.domain')}/images/botometerAnalyser/${analysis.imageUrl}.png`,
					image_url: `${config.get('hooks.domain')}/images/botometerAnalyser/${analysis.imageUrl}.png`
				}
			]
		},
	});
}


async function answerRetweetAnalysis({ context, analysis }) {
	const { screenName, tweet, responseUrl, requesterUsername } = context;

	request({
		url: responseUrl,
		method: 'POST',
		json: {
			text: `@${requesterUsername} Done!`,
			response_type: 'in_channel',
			attachments: [
				{
					fields: [
						{
							short: false,
							title: `On the latest ${analysis.users.total} retweets of "${tweet.text}" by @${screenName}:`,
							value: `**${analysis.users.percentageBot}%** have a high probability to be made by bots\n**${analysis.users.percentageHuman}%** have a high probability to be made by humans\nFor the remaining **${analysis.users.percentageUnknown}%** it's difficult to say`
						},
					],
				},
				{
					title: 'Here is the distribution',
					title_link: `${config.get('hooks.domain')}/images/botometerAnalyser/${analysis.imageUrl}.png`,
					image_url: `${config.get('hooks.domain')}/images/botometerAnalyser/${analysis.imageUrl}.png`
				}
			]
		},
	});
}


module.exports = {
	RETWEET_ANALYSIS,
	TEXT_SEARCH_ANALYSIS,
	scheduleUsersAnalysis,
	analyseUsersScores,
};
