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

	if (!tweet.retweet_count) {
		request({
			url: responseUrl,
			method: 'POST',
			json: {
				text: `@${requesterUsername} Nobody retweeted the tweet "${tweet.id_str}"`,
				response_type: 'in_channel'
			},
		});
		return;
	}

	await retweeterIdsQueue.add({
		screenName,
		tweet,
		tweetId,
		retweeterIds: [],
		cursor: '-1',
		responseUrl,
		requesterUsername
	});
}


retweeterIdsQueue.on('completed', onRetweetersCompleted);

async function onRetweetersCompleted(job, result) {
	try {
		const { screenName, tweet, tweetId, responseUrl, requesterUsername } = job.data;
		const retweeterIdsBatch = result.data.ids;
		const nextCursor = result.data.next_cursor_str;
		const retweeterIds = job.data.retweeterIds.concat(retweeterIdsBatch);

		if (nextCursor !== '0') {
			// NB: Currently this never happens
			// See https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/get-statuses-retweeters-ids.html, https://github.com/sferik/twitter/issues/425
			await retweeterIdsQueue.add({
				screenName,
				tweet,
				tweetId,
				retweeterIds,
				cursor: nextCursor,
				responseUrl,
				requesterUsername
			});
			return;
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
