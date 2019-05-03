const config = require('config');
const express = require('express');
const request = require('request-promise');

const router = express.Router();

router.post('/', async (req, res) => {
	const { context } = req.body;

	context.attachments[0].actions = [
		{
			name: 'Scale',
			integration: {
				url: config.get('hooks.sendToAnalysis.actionUrl'),
				context: {
					region: context.region, // we assume that for only french media-scale is available
					shares: context.shares,
					url: config.get('hooks.sendToAnalysis.actionResponseUrl')
				}
			}
		}
	];

	await request({
		url: config.get('hooks.sendToAnalysis.incomingWebHookUrl'),
		method: 'POST',
		json: context,
	});

	res.json({
		update: {
			message: `
**${context.attachments[0].title}**
${context.attachments[0].text}

:arrow_upper_left: **_Sent to [FR] Analysis_**
`
		}
	});
});

module.exports = router;
