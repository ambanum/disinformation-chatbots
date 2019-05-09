const request = require('request-promise');

const cache = require('../cache');
const usersAnalysis = require('../usersAnalysis');
const { retweeterIdsQueue } = require('../queues/retweeters');


async function analyse({ screenName, tweetId, responseUrl, requesterUsername }) {
	retweeterIdsQueue.add({
		screenName,
		tweetId,
		responseUrl,
		requesterUsername
	});
}


retweeterIdsQueue.on('completed', onRetweetersCompleted);

async function onRetweetersCompleted(job, result) {
	try {
		const { screenName, tweetId, responseUrl, requesterUsername } = job.data;
		const retweeterIds = result.ids;

		// If there is no search results, nothing to do
		if (!retweeterIds.length) {
			return request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Nobody retweeted the tweet "${tweetId}"`,
					response_type: 'in_channel'
				},
			});
		}

		const users = retweeterIds.map(tweet => ({ screenName: tweet.user.screen_name, id: tweet.user.id_str }));
		const unscoredUsers = users.filter(user => !cache.getUserById(user.id));

		await usersAnalysis.scheduleUsersAnalysis({
			search: tweetId,
			responseUrl,
			requesterUsername,
			users,
			unscoredUsers
		});
	} catch (e) {
		console.error(e);
	}
}


module.exports = {
	analyse,
};
