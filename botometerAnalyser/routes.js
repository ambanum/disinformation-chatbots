const config = require('config');
const express = require('express');
const Arena = require('bull-arena');

const { botometerQueue } = require('./queues/botometer');
const queryText = require('./pipelines/queryText');
const retweets = require('./pipelines/retweets');


const RETWEET_REGEXP = /^https:\/\/twitter\.com\/([^\/]*)\/status\/(\d+)$/;

const router = express.Router();

const mattermostToken = config.get('hooks.botometerAnalyser.mattermost.token');


if (process.env.NODE_ENV !== 'test') {
	Arena({
		queues: [
			{ name: 'Botometer: getScore', hostId: 'Botometer: getScore' }
		]
	});
}

async function startQueryTextPipeline({ responseUrl, requesterUsername, search }) {
	const activeJobsCount = await botometerQueue.getActiveCount();

	queryText.analyse({
		search,
		responseUrl,
		requesterUsername,
	});

	return `
Roger! I'm analysing the probability that the accounts that have tweeted **"${search}"** in the last 7 days are robots.
${activeJobsCount ? '\n:mantelpiece_clock: _I’m already running an analysis, I will search for yours as soon as possible._' : '\n_In order to limit that search to 30 minutes, we will stop at 100 accounts max._'}
`;
}

async function startRetweetPipeline({
	responseUrl, requesterUsername, screenName, tweetId, tweetUrl
}) {
	const activeJobsCount = await botometerQueue.getActiveCount();

	retweets.analyse({
		screenName,
		tweetId,
		tweetUrl,
		responseUrl,
		requesterUsername
	});

	return `
Roger! I'm analysing the probability that the accounts that have retweeted that tweet by @${screenName} are robots.
${activeJobsCount ? '\n:mantelpiece_clock: _I’m already running an analysis, I will search for yours as soon as possible._' : '\n_In order to limit that search to 25 minutes, we might not analyse all retweeters._'}
`;
}


router.get('/', async (req, res, next) => {
	const { token: givenToken, text } = req.query;

	if (givenToken !== mattermostToken) {
		return res.status(401).json({ Error: 'Missing or invalid token' });
	}

	if (!text) {
		return res.json({
			text: 'Hey! I can help you by analyzing the latest shares on a specific topic but I need a query.\nSo, give me a keyword, an URL or some text. For example: \n`/botometer disinformation`'
		});
	}

	const retweetRegexpResult = text.match(RETWEET_REGEXP);
	let responseText = null;
	if (retweetRegexpResult) {
		const screenName = retweetRegexpResult[1];
		const tweetId = retweetRegexpResult[2];

		responseText = await startRetweetPipeline({
			responseUrl: req.query.response_url,
			requesterUsername: req.query.user_name,
			screenName,
			tweetId,
			tweetUrl: text
		});
	} else {
		responseText = await startQueryTextPipeline({
			responseUrl: req.query.response_url,
			requesterUsername: req.query.user_name,
			search: text,
		});
	}

	res.json({
		response_type: 'in_channel',
		text: responseText,
	});
});

module.exports = {
	RETWEET_REGEXP,
	router,
};
