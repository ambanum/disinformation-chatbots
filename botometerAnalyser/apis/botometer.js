const config = require('config');
const Botometer = require('node-botometer');

const B = new Botometer({
	consumer_key: config.get('hooks.botometerAnalyser.botometer.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.botometer.consumer_secret'),
	access_token_key: config.get('hooks.botometerAnalyser.botometer.access_token_key'),
	access_token_secret: config.get('hooks.botometerAnalyser.botometer.access_token_secret'),
	app_only_auth: true,
	mashape_key: config.get('hooks.botometerAnalyser.botometer.mashape_key'),
	rate_limit: 0,
	log_progress: true,
	include_user: true,
	include_timeline: false,
	include_mentions: false
});

module.exports = {
	B,
};
