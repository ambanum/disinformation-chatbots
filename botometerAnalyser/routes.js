const config = require('config');
const express = require('express');
const Arena = require('bull-arena');

const router = express.Router();
const { queue } = require('./botometer');
const index = require('./index');

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

	index.analyse({
		search,
		responseUrl: req.query.response_url,
		requesterUsername: req.query.user_name
	});

	res.json({
		response_type: 'in_channel',
		text: `
Roger! I'm analysing the probability that the accounts that have tweeted **"${search}"** in the last 7 days are robots.
${activeJobsCount ? '\n:information_source: _There is already an analysis running, your request will be processed later._' : '\n_This should take 30 minutes max._'}
`
	});
});

module.exports = router;
