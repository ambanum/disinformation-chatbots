const request = require('request-promise');
const config = require('config');

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
			callerCallback: sendAnswer,
			callerData: {
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


async function sendAnswer({ callerData, analysis }) {
	const { screenName, tweetId, responseUrl, requesterUsername } = callerData;

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
							title: `On the latest ${analysis.users.total} retweets of "${tweetId}" by @${screenName}:`, //TODO
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
	analyse,
};
