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
			text: 'Salut! Je peux vous aider en effectuant une recherche inversée d\'image, pour cela j\'ai besoin d\'une url. Par exemple : \n`/source <image url>`'
		});
	}

	res.json({
		response_type: 'in_channel',
		text: `Okay ! Je vais voir ce que je trouve pour l'image ${text} et je réponds rapidement.`,
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
