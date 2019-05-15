const request = require('request-promise');
const d = require('debug');

const debug = d('BotometerAnalyser:queryText:debug');
const usersAnalysis = require('./usersAnalysis');
const { searchQueue } = require('../queues/search');


async function analyse({ search, responseUrl, requesterUsername }) {
	searchQueue.add({
		search,
		responseUrl,
		requesterUsername
	});
}


searchQueue.on('completed', onTwitterSearchCompleted);


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
					text: `@${requesterUsername} Nobody shared "${search}" on Twitter in the last 7 days`,
					response_type: 'in_channel'
				},
			});
		}

		const userIds = tweets.map(tweet => (tweet.user.id_str));

		await usersAnalysis.scheduleUsersAnalysis({
			userIds,
			analysisType: usersAnalysis.TEXT_SEARCH_ANALYSIS,
			context: {
				search,
				responseUrl,
				requesterUsername,
			},
		});
	} catch (e) {
		console.error(e);
	}
}


module.exports = {
	analyse,
	onTwitterSearchCompleted,
};
