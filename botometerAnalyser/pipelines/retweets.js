const request = require('request-promise');

const usersAnalysis = require('./usersAnalysis');
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
		const retweeterIds = result.data.ids;

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

		const users = retweeterIds.map(userId => ({ userId }));

		await usersAnalysis.scheduleUsersAnalysis({
			users,
			analysisType: usersAnalysis.RETWEET_ANALYSIS,
			context: {
				screenName,
				tweetId,
				responseUrl,
				requesterUsername,
			}
		});
	} catch (e) {
		console.error(e);
	}
}


module.exports = {
	analyse,
};
