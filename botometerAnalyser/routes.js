const config = require('config');
const express = require('express');
const Arena = require('bull-arena');

const router = express.Router();
const { queue } = require('./queues/botometer');
const queryText = require('./pipelines/queryText');

const mattermostToken = config.get('hooks.botometerAnalyser.mattermost.token');


if (process.env.NODE_ENV !== 'test') {
	Arena({
		queues: [
			{ name: 'Botometer: getScore', hostId: 'Botometer: getScore' }
		]
	});
}

router.get('/', async (req, res, next) => {
	const { token: givenToken, text: search } = req.query;

	if (givenToken !== mattermostToken) {
		return res.status(401).json({ Error: 'Missing or invalid token' });
	}

	if (!search) {
		return res.json({
			text: 'Hey! I can help you by analyzing the latest shares on a specific topic but I need a query.\nSo, give me a keyword, an URL or some text. For example: \n`/botometer disinformation`'
		});
	}

	const activeJobsCount = await queue.getActiveCount();

	queryText.analyse({
		search,
		responseUrl: req.query.response_url,
		requesterUsername: req.query.user_name
	});

	res.json({
		response_type: 'in_channel',
		text: `
Roger! I'm analysing the probability that the accounts that have tweeted **"${search}"** in the last 7 days are robots.
${activeJobsCount ? '\n:mantelpiece_clock: _I’m already running an analysis, I will search for yours as soon as possible._' : '\n_In order to limit that search to 30 minutes, we will stop at 100 accounts max._'}
`
	});
});

module.exports = router;
