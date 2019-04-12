const config = require('config');
const ChartjsNode = require('chartjs-node');
const uuidv1 = require('uuid/v1');

const utils = require('./utils');

function rangeLabel() {
	let label = 0;

	const result = [label];
	const stepsCount = config.get('hooks.botometerAnalyser.maxScore') / config.get('hooks.botometerAnalyser.range');
	let actualStep = 1;

	while (actualStep <= stepsCount) {
		label += config.get('hooks.botometerAnalyser.range');
		result.push(label);
		actualStep++;
	}

	return result;
}

function generateFromScores(usersScores, sharesScores) {
	const options = {
		type: 'line',
		data: {
			labels: rangeLabel(),
			datasets: [{
				label: 'percentage of users by range',
				data: utils.percentageOfUserByScoreRange(usersScores),
				backgroundColor: 'rgba(87, 181, 96, 0.3)',
				borderColor: 'rgba(87, 181, 96, 1)',
				// Hide points
				pointBorderColor: 'rgba(0, 0, 0, 0)',
				pointBackgroundColor: 'rgba(0, 0, 0, 0)',
				borderWidth: 1
			},
			{
				label: 'percentage of shares by range',
				data: utils.percentageOfUserByScoreRange(sharesScores),
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
						labelString: 'Percentage of users',
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
						labelString: 'Botometer score',
						fontSize: 24,
						fontColor: '#111'
					},
				}]
			},
		}
	};

	const chartNode = new ChartjsNode(1000, 1000);
	return chartNode.drawChart(options)
		.then(() => {
			console.log();
			const fileName = uuidv1();
			console.log(`Writing distribution graph to ./public/images/botometerAnalyser/${fileName}.png`);
			chartNode.writeImageToFile('image/png', `./public/images/botometerAnalyser/${fileName}.png`);
			return fileName;
		});
}

module.exports = {
	generateFromScores,
	rangeLabel,
};
