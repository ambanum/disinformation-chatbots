const request = require('request-promise');
const d = require('debug');
const config = require('config');

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

		const users = tweets.map(tweet => ({ screenName: tweet.user.screen_name, userId: tweet.user.id_str }));

		await usersAnalysis.scheduleUsersAnalysis({
			search,
			responseUrl,
			requesterUsername,
			users,
			callerCallback: sendAnswer,
		});
	} catch (e) {
		console.error(e);
	}
}

async function sendAnswer({ search, requesterUsername, responseUrl, analysis }) {
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


module.exports = {
	analyse,
	onTwitterSearchCompleted,
	sendAnswer,
};
