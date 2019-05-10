const request = require('request-promise');

const usersAnalysis = require('./usersAnalysis');
const { retweeterIdsQueue } = require('../queues/retweeters');
const { getTweetQueue } = require('../queues/getTweet');


async function analyse({ screenName, tweetId, tweetUrl, responseUrl, requesterUsername }) {
	getTweetQueue.add({
		screenName,
		tweetId,
		tweetUrl,
		responseUrl,
		requesterUsername
	});
}

getTweetQueue.on('completed', onGetTweetCompleted);
getTweetQueue.on('failed', failed);

async function failed(job) {
	const { tweetUrl, responseUrl, requesterUsername } = job.data;

	return request({
		url: responseUrl,
		method: 'POST',
		json: {
			text: `@${requesterUsername} I could not found the tweet ${tweetUrl}. Are you sure you spelled it correctly?`,
			response_type: 'in_channel'
		},
	});
}


async function onGetTweetCompleted(job, result) {
	const {	screenName, responseUrl, tweetId, requesterUsername } = job.data;
	const tweet = result.data;

	retweeterIdsQueue.add({
		screenName,
		tweet,
		tweetId,
		responseUrl,
		requesterUsername
	});
}


retweeterIdsQueue.on('completed', onRetweetersCompleted);

async function onRetweetersCompleted(job, result) {
	try {
		const { screenName, tweet, responseUrl, requesterUsername } = job.data;
		const retweeterIds = result.data.ids;

		// If there is no search results, nothing to do
		if (!retweeterIds.length) {
			return request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Nobody retweeted the tweet "${tweet.id_str}"`,
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
				tweet,
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
	onRetweetersCompleted,
};
