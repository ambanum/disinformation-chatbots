const ChartjsNode = require('chartjs-node');
const uuidv1 = require('uuid/v1');

const utils = require('./utils');

async function generateFromScores(usersScores, sharesScores) {
	const options = {
		type: 'line',
		data: {
			labels: utils.rangeLabel(),
			datasets: [{
				label: 'pourcentage d\'utilisateurs par intervalle',
				data: utils.percentageOfScoreByRange(usersScores),
				backgroundColor: 'rgba(87, 181, 96, 0.3)',
				borderColor: 'rgba(87, 181, 96, 1)',
				// Hide points
				pointBorderColor: 'rgba(0, 0, 0, 0)',
				pointBackgroundColor: 'rgba(0, 0, 0, 0)',
				borderWidth: 1
			},
			{
				label: 'pourcentage de partages par intervalle',
				data: utils.percentageOfScoreByRange(sharesScores),
				backgroundColor: 'rgba(101, 154, 206, 0.3)',
				borderColor: 'rgba(101, 154, 206, 1.00)',
				// Hide points
				pointBorderColor: 'rgba(0, 0, 0, 0)',
				pointBackgroundColor: 'rgba(0, 0, 0, 0)',
				borderWidth: 1
			}]
		},
		options: {
			plugins: {
				beforeDraw(chart) {
					const { ctx } = chart.chart;
					ctx.save();
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, chart.width, chart.height);
					ctx.restore();
				}
			},
			legend: {
				display: true,
				labels: {
					fontColor: 'rgba(0, 0, 0, 0.95)',
					fontSize: 14,
				}
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'Pourcentage d\'utilisateurs',
						fontSize: 24,
						fontColor: '#111'
					},
					ticks: {
						min: 0,
						max: 100
					}
				}],
				xAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'Score Botometer',
						fontSize: 24,
						fontColor: '#111'
					},
				}]
			},
		}
	};

	const chartNode = new ChartjsNode(1000, 1000);
	await chartNode.drawChart(options);
	const fileName = uuidv1();
	const directory = './public/images/botometerAnalyser/exercice';
	const filePath = `${directory}/${fileName}.png`;

	console.log();
	console.log(`Writing distribution graph to ${filePath}`);
	chartNode.writeImageToFile('image/png', filePath);
	return fileName;
}

module.exports = {
	generateFromScores
};
