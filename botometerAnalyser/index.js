const config = require('config');
const request = require('request-promise');
const d = require('debug');

const debug = d('BotometerAnalyser:index:debug');
const logError = d('BotometerAnalyser:index:error');
const graph = require('./graph');
const botometer = require('./botometer');
const utils = require('./utils');
const twitter = require('./twitter');
const cache = require('./cache');

async function onTwitterSearchCompleted(job, result) {
	try {
		const { search, responseUrl, requesterUsername } = job.data;
		const tweets = result.data.statuses;
		debug(`Twitter search "${search}" job completed, found ${tweets.length} results`);

		// If there is no search results, nothing to do
		if (!tweets.length) {
			debug(`No results found on Twitter for the search ${search}`);
			return request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Sorry, we found no results on Twitter for the search "${search}"`,
					response_type: 'in_channel'
				},
			});
		}

		const users = tweets.map(tweet => ({ screenName: tweet.user.screen_name, id: tweet.user.id_str }));
		const unscoredUsers = users.filter(user => !cache.getUserById(user.id));

		debug(`Found ${users.length} users with ${unscoredUsers.length} not already in the cache`);

		await botometer.scheduleUsersAnalysis({
			search,
			responseUrl,
			requesterUsername,
			users,
			unscoredUsers
		});
	} catch (e) {
		console.error(e);
	}
}

twitter.searchQueue.on('completed', onTwitterSearchCompleted);

async function analyseUsersScores(users = []) {
	// Get all users relate to the requester's search from cache
	const cachedUsers = users.map(user => cache.getUserById(user.id)).filter(user => !!user);
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

botometer.queue.on('completed', async (job, botometerScore) => {
	try {
		const {
			user,
			unscoredUsers,
			users,
			search,
			requesterUsername,
			responseUrl,
			startTimestamp
		} = job.data;

		debug(`Botometer job for user ${user.screenName} completed`);

		if (!botometerScore) {
			debug(`Add in the cache user without score: ${user}`);
			cache.addUser(user.screenName, user.id, 'NA');
		} else {
			debug(`Add in the cache user with score: ${botometerScore.user.screen_name}, ${botometerScore.user.id_str}, ${botometerScore.botometer.display_scores.universal}`);
			cache.addUser(botometerScore.user.screen_name, botometerScore.user.id_str, botometerScore.botometer.display_scores.universal);
		}

		const stillUnscoredUsers = unscoredUsers.filter(user => !cache.getUserById(user.id));
		debug('Remaining users to be scored for this search', stillUnscoredUsers.length);

		const isTimeoutExpired = new Date() >= new Date(startTimestamp + config.get('hooks.botometerAnalyser.timeout'));

		if (!stillUnscoredUsers.length || isTimeoutExpired) {
			debug(`Users remaining to score: ${stillUnscoredUsers.length}, is timeout expired? ${isTimeoutExpired}`);
			debug(`Botometer analyser: Job (${job.timestamp}, ${job.id}) completed for search "${search}" requested by "${requesterUsername}"`);

			const result = await analyseUsersScores(users);

			request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Done!`,
					response_type: 'in_channel',
					attachments: [
						{
							title: 'During the last week',
							fields: [
								{
									short: false,
									title: `On the latest ${result.shares.total} shares of "${search}":`,
									value: `**${result.shares.percentageBot}%** have a high probability to be made by bots\n**${result.shares.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.shares.percentageUnknown}%** others it's difficult to say`
								},
								{
									short: false,
									title: `On the ${result.users.total} users that have shared "${search}" lately:`,
									value: `**${result.users.percentageBot}%** have a high probability to be made by bots\n**${result.users.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.users.percentageUnknown}%** others it's difficult to say`
								},
							],
						},
						{
							title: 'Here is the distribution',
							title_link: `${config.get('hooks.domain')}/images/botometerAnalyser/${result.imageUrl}.png`,
							image_url: `${config.get('hooks.domain')}/images/botometerAnalyser/${result.imageUrl}.png`
						}
					]
				},
			});
		}
	} catch (error) {
		logError(error);
	}
});

async function analyse({ search, responseUrl, requesterUsername }) {
	twitter.searchQueue.add({
		search,
		responseUrl,
		requesterUsername
	});
}

module.exports = {
	analyse,
	analyseUsersScores,
	onTwitterSearchCompleted
};
