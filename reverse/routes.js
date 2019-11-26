const request = require('request-promise');
const config = require('config');
const express = require('express');
const fs = require('fs');
const uuidv1 = require('uuid/v1');

const router = express.Router();

const mattermostToken = config.get('hooks.botometerAnalyser.mattermost.tokenExercice');

router.get('/', async (req, res, next) => {
	const {
		token: givenToken,
		text,
		response_url: responseUrl,
		user_name: requesterUsername
	} = req.query;

	if (!text) {
		return res.json({
			text: 'Salut! Je peux vous aider en analysant les dernièrs tweets sur un sujet spécifique, mais j\'ai besoin d\'une requête.\nAlors, donnez-moi un mot clé, une URL ou du texte. Par exemple : \n`/botometer variole`'
		});
	}

	res.json({
		response_type: 'in_channel',
		text: `Okay ! J'analyse la probabilité que les comptes qui ont tweetés sur le sujet **"${text}"** soient des robots et je vous réponds dans les 5 min.`,
	});

	const fileName = uuidv1();
	const isSocialRoom = text.includes('https://www.socialroom.crisotech.com');
	if (isSocialRoom) {
		const authUrl = text.replace('https://www.socialroom.crisotech.com', 'https://observateur:V%40riole19@www.socialroom.crisotech.com');
		const file = fs.createWriteStream(`./public/images/reverse/${fileName}.png`);
		/* Using Promises so that we can use the ASYNC AWAIT syntax */

		await request(authUrl)
			.pipe(file)
			.on('finish', () => {
				console.log(`The file is finished downloading.`);
			})
			.on('error', (error) => {
				console.error(error);
			});
  }

  const imageUrl = isSocialRoom ? `${config.get('hooks.domain')}/images/reverse/${fileName}.png` : text;

	await request('http://localhost:5000/search', {
		method: 'POST',
		body: {
			image_url: imageUrl,
			resized_images: false
		},
		json: true
	}).then((res) => {
		console.log(res);

		const fields = res.links.map((link) => {
			return {
				short: false,
				value: `[${link}](${link})`
			};
		});

		request({
			url: responseUrl,
			method: 'POST',
			json: {
				text: `@${requesterUsername} Voilà!`,
				response_type: 'in_channel',
				attachments: [{
					title: 'Voici l\'image que j\'ai recherché analysé',
					title_link: imageUrl,
					image_url: imageUrl,
					fields: [{
							short: false,
							value: 'Voici les différents résultats possibles :'
						},
						...fields,
					]
				}]
			},
		});
	});
});

module.exports = {
	router,
};
