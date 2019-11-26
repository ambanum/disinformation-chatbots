const request = require('request-promise');
const config = require('config');
const express = require('express');
const graph = require('./graph');
const utils = require('./utils');

const router = express.Router();

const mattermostToken = config.get('hooks.botometerAnalyser.mattermost.tokenExercice');

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
			text: 'Salut! Je peux vous aider en analysant les dernièrs tweets sur un sujet spécifique, mais j\'ai besoin d\'une requête.\nAlors, donnez-moi un mot clé, une URL ou du texte. Par exemple : \n`/botometer variole`'
		});
	}

	res.json({
		response_type: 'in_channel',
		text: `Okay! J'analyse la probabilité que les comptes qui ont tweet sur le sujet **"${text}"** soient des robots et je vous réponds dans les 5 min.`,
	});

	request('https://observateur:V%40riole19@www.socialroom.crisotech.com/api/modules/twitter/tweets?firstPosition=-1&keywords=t&maxResults=250')
		.then(async (response) => {
			const result = JSON.parse(response);

			const usersScores = result.map(((tweet) => {
				const result = {
					id: tweet.user.id
				};
				switch (tweet.user.twitterProfile) {
				case 'PLAYER':
					result.score = randomIntFromInterval(0, 1.4);
					break;
				case 'MANUAL_DUMMY':
					result.score = randomIntFromInterval(1.4, 3.8);
					break;
				case 'AUTO_DUMMY':
					result.score = randomIntFromInterval(1.4, 5);
					break;
				case 'ANIMATOR':
					result.score = randomIntFromInterval(0, 1);
					break;
				default:
					result.score = 1;
				}

				return result;
			}));

			const uniqueUsersScores = removeDuplicates(usersScores, 'id');

			const scores = usersScores.map(obj => obj.score);
			const uniqueScores = uniqueUsersScores.map(obj => obj.score);

			const sharesPercentage = utils.percentagesBotHuman(scores);
			const usersPercentage = utils.percentagesBotHuman(uniqueScores);

			const imageFileName = await graph.generateFromScores(uniqueScores, scores);

			const analysis = {
				shares: {
					total: scores.length,
					percentageUnknown: 100 - (sharesPercentage.percentageBot + sharesPercentage.percentageHuman),
					percentageBot: sharesPercentage.percentageBot,
					percentageHuman: sharesPercentage.percentageHuman,
				},
				users: {
					total: uniqueScores.length,
					percentageUnknown: 100 - (usersPercentage.percentageBot + usersPercentage.percentageHuman),
					percentageBot: usersPercentage.percentageBot,
					percentageHuman: usersPercentage.percentageHuman,
				},
				imageUrl: imageFileName
			};

			request({
				url: responseUrl,
				method: 'POST',
				json: {
					text: `@${requesterUsername} Voilà!`,
					response_type: 'in_channel',
					attachments: [
						{
							// title: 'During the last 7 days',
							fields: [
								{
									short: false,
									title: `Sur les ${analysis.shares.total} derniers tweets de "${text}" :`,
									value: `**${analysis.shares.percentageBot}%** ont une grande probabilité d'avoir été ecrit par des robots\n**${analysis.shares.percentageHuman}%** ont une grande probabilité d'avoir été ecrit par des humains\nPour les **${analysis.shares.percentageUnknown}%** restants, c'est difficile à dire`
								},
								{
									short: false,
									title: `Sur les ${analysis.users.total} utilisateurs qui ont rédigé un tweet contenant "${text}" :`,
									value: `**${analysis.users.percentageBot}%** ont une grande probabilité d'être des robots\n**${analysis.users.percentageHuman}%** ont une grande probabilité d'être des humains\nPour les **${analysis.users.percentageUnknown}%** restants, c'est difficile à dire`
								},
							],
						},
						{
							title: 'Voici un graph de distribution',
							title_link: `${config.get('hooks.domain')}/images/botometerAnalyser/exercice/${analysis.imageUrl}.png`,
							image_url: `${config.get('hooks.domain')}/images/botometerAnalyser/exercice/${analysis.imageUrl}.png`
						}
					]
				},
			});
		});
});

function randomIntFromInterval(min, max) { // min and max included
	return Math.random() * (max - min + 1) + min;
}

function removeDuplicates(myArr, prop) {
	return myArr.filter((obj, pos, arr) => {
		return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
	});
}

module.exports = {
	router,
};
