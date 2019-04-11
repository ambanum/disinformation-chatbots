const config = require('config');
const express = require('express');

const router = express.Router();
const queue = require('./queue');

const botIconUrl = config.get('hooks.botometerAnalyser.mattermost.icon');
const botUsername = config.get('hooks.botometerAnalyser.mattermost.username');
const mattermostToken = config.get('hooks.botometerAnalyser.mattermost.token');

router.get('/', async (req, res, next) => {
	const givenToken = req.query.token;
	if (givenToken !== mattermostToken) {
		return res.status(401).json({ error: 'Invalid token' });
	}

	const search = req.query.text;

	if (!search) {
		return res.json({
			icon_url: botIconUrl,
			username: botUsername,
			text: 'Hey! I can help you by analyzing the latest shares on a specific topic but I need a query.\nSo, give me a keyword, an URL or some text. For example: \n`/botometer disinformation`'
		});
	}

	const activeJobsCount = await queue.getActiveCount();

	res.json({
		response_type: 'in_channel',
		icon_url: botIconUrl,
		username: botUsername,
		text: `
Roger! I'm analysing the probability that the accounts (${config.get('hooks.botometerAnalyser.maxAccountToAnalyse')} max) that have tweeted **"${search}"** in the past week are robots.
${activeJobsCount ? '\n:information_source: _There is already an analyse running, your request will be processed later._' : '\n_This should take 30 minutes max._'}
`
	});

	await queue.add({
		search,
		responseUrl: req.query.response_url,
		requesterUsername: req.query.user_name,
		botIconUrl,
		botUsername,
	});
});

module.exports = router;
