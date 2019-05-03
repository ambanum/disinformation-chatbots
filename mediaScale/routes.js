const express = require('express');
const config = require('config');
const request = require('request-promise');
const validator = require('validator');
const moment = require('moment');

const router = express.Router();

router.get('/', async (req, res) => {
	const { text } = req.query;

	if (!text) {
		return res.json({
			text: "Hey! I can help you to put an article's number of reactions into perspective but I need a region code and number of shares.\nFor example: `/scale fr 5617`"
		});
	}

	const splittedText = text.split(' ');
	let [region = '', shares = ''] = splittedText;

	// allow passing params in undefined order in mattermost
	if (!validator.isInt(shares) && validator.isInt(region)) {
		[shares, region] = splittedText;
	}

	if (!shares && !region) {
		return res.json({
			text: "Hey! I can help you to put an article's number of reactions into perspective but I need a region code and number of shares.\nFor example: `/scale fr 5617`"
		});
	}

	if (!shares) {
		return res.json({
			text: 'Hey! I need a number of shares to compare to.\nFor example: `/scale fr 5617`'
		});
	}

	if (!region) {
		return res.json({
			text: 'Hey! I need a region code.\nFor example: `/scale fr 5617`'
		});
	}

	if (!validator.isISO31661Alpha2(region)) {
		return res.json({
			text: 'Hey! I need a valid region code in ISO 3166-1 alpha-2 format.\nFor example: `/scale fr 5617`'
		});
	}

	if (!validator.isInt(shares, { min: 0 })) {
		return res.json({
			text: 'Hey! I need a valid shares number (> 0).\nFor example: `/scale fr 5617`'
		});
	}

	try {
		const result = JSON.parse(await request({
			url: `${config.get('hooks.mediaScale.baseUrl')}/media-scale/1.0/around?region=${region}&shares=${shares}`,
			method: 'GET'
		}));
		const fields = Object.keys(result).map(key => ({
			title: result[key].title,
			value: `_${key}_, [article](${result[key].url}) published on ${moment(result[key].date).format('LL')}`,
		}));

		res.json({
			response_type: 'in_channel',
			attachments: [
				{
					text: `_**${shares}** shares for a French article, it is comparable to:_`,
					fields
				}
			]
		});
	} catch (responseError) {
		if (responseError.statusCode === 404 && /region not found/.test(responseError.error)) {
			return res.json({
				text: 'Hey! The requested region is not already supported'
			});
		}
		return res.status(responseError.statusCode).json({
			text: responseError.message
		});
	}
});

router.post('/', async (req) => {
	const { context } = req.body;

	const { region, shares, url } = context;

	try {
		const result = JSON.parse(await request({
			url: `${config.get('hooks.mediaScale.baseUrl')}/media-scale/1.0/around?region=${region}&shares=${shares}`,
			method: 'GET'
		}));
		const fields = Object.keys(result).map(key => ({
			title: result[key].title,
			value: `_${key}_, [article](${result[key].url}) published on ${moment(result[key].date).format('LL')}`,
		}));

		await request({
			url,
			method: 'POST',
			json: {
				attachments: [
					{
						text: `_**${shares}** shares for a French article, it is comparable to:_`,
						fields
					}
				]
			}
		});
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;
