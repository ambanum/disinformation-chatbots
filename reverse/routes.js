const request = require('request-promise');
const config = require('config');
const express = require('express');

const router = express.Router();

const mattermostToken = config.get('hooks.reverse.mattermost.token');

router.get('/', async (req, res, next) => {
	const {
		token: givenToken,
		text,
		response_url: responseUrl,
		user_name: requesterUsername
	} = req.query;

	if (givenToken !== mattermostToken) {
		return res.status(401).json({
			Error: 'Missing or invalid token'
		});
	}

	if (!text) {
		return res.json({
			text: 'Hey! I can help you by doing a reverse image search, for that I need a url. For example : \n`/source <image_url>`'
		});
	}

	res.json({
		response_type: 'in_channel',
		text: `Okay ! I'll see what I find for the image ${text} and I answer quickly.`,
	});

	const imageUrl = text;

	await request('http://localhost:5000/search', {
		method: 'POST',
		body: {
			image_url: imageUrl,
			resized_images: false
		},
		json: true
	}).then(async ({ links }) => {
		let fields = links.map(link => ({
			short: false,
			value: `[${link}](${link})`
		}));

		fields = [{
			short: false,
			value: 'Here are the different possible results:'
		}, ...fields];

		const yandexUrl = `https://www.yandex.com/images/search?text=${imageUrl}&img_url=${imageUrl}&rpt=imageview`;
		const yandexAttachement = {
			color: '#E0995E',
			title: 'Other possible results:',
			title_link: yandexUrl,
			fields: [{
				short: false,
				value: `[↗ See Yandex results](${yandexUrl})`
			}]
		};

		request({
			url: responseUrl,
			method: 'POST',
			json: {
				text: `@${requesterUsername} Voilà!`,
				response_type: 'in_channel',
				attachments: [{
					color: '#E0995E',
					title: 'Here is the picture that I looked for',
					title_link: imageUrl,
					image_url: imageUrl,
					fields,
				}, yandexAttachement]
			},
		});
	});
});

module.exports = router;
