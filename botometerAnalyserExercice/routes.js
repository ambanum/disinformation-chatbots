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
		text: `Okay ! J'analyse la probabilité que les comptes qui ont tweetés sur le sujet **"${text}"** soient des robots et je vous réponds dans les 5 min.`,
	});

	const promises = [];
	let position = -1;
	let maxResult = 50;
	for (let i = 0; i <= 5; i++) {
		const source = `https://observateur:V%40riole19@www.socialroom.crisotech.com/api/modules/twitter/tweets?firstPosition=${position}&keywords=${text}&maxResults=${maxResult}`;
		position = maxResult;
		maxResult += 50;
		console.log(source);
		promises.push(request(source).catch((error) => {
			console.log(error);
		}));
	}

	let allUsersScores;
	Promise.all(promises).then(async (results) => {
		try {
			allUsersScores = results.map(r => JSON.parse(r)).flat();
		} catch (e) {
			console.log(e);
		}

		allUsersScores = removeDuplicates(allUsersScores, 'id');

		allUsersScores = allUsersScores.map((tweet) => {
			const userScore = {
				id: tweet.user.id
			};
			switch (tweet.user.twitterProfile) {
			case 'PLAYER':
				userScore.score = randomIntFromInterval(0, 1.4);
				break;
			case 'MANUAL_DUMMY': // gaussienne 1.5
				userScore.score = randomIntFromInterval(0.8, 3);
				break;
			case 'AUTO_DUMMY': // gaussienne 4.5
				userScore.score = randomIntFromInterval(2.5, 5);
				break;
			case 'ANIMATOR':
				userScore.score = randomIntFromInterval(0, 1);
				break;
			default:
				userScore.score = 1;
			}

			return userScore;
		});


		console.log(allUsersScores.length);

		const uniqueUsersScores = removeDuplicates(allUsersScores, 'id');

		const scores = allUsersScores.map(obj => obj.score);
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

		console.log(analysis);

		request({
			url: responseUrl,
			method: 'POST',
			json: {
				text: `@${requesterUsername} Voilà!`,
				response_type: 'in_channel',
				attachments: [{
						fields: [{
								short: false,
								title: `Sur les ${analysis.shares.total} derniers tweets contenant « ${text} » :`,
								value: `**${analysis.shares.percentageBot}%** ont une grande probabilité d'avoir été ecrit par des robots\n**${analysis.shares.percentageHuman}%** ont une grande probabilité d'avoir été ecrit par des humains\nPour les **${analysis.shares.percentageUnknown}%** restants, c'est difficile à dire`
							},
							{
								short: false,
								title: `Sur les ${analysis.users.total} utilisateurs qui ont rédigé un tweet contenant « ${text} » :`,
								value: `**${analysis.users.percentageBot}%** ont une grande probabilité d'être des robots\n**${analysis.users.percentageHuman}%** ont une grande probabilité d'être des humains\nPour les **${analysis.users.percentageUnknown}%** restants, c'est difficile à dire`
							},
						],
					},
					{
						title: 'Voici un graphe de distribution des comptes par type',
						title_link: `${config.get('hooks.domain')}/images/botometerAnalyser/exercice/${analysis.imageUrl}.png`,
						image_url: `${config.get('hooks.domain')}/images/botometerAnalyser/exercice/${analysis.imageUrl}.png`,
						fields: [{
							short: false,
							value: `[Voir le graphe de distribution en plein écran](${config.get('hooks.domain')}/images/botometerAnalyser/exercice/${analysis.imageUrl}.png)`
						}]
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
