const Twitter = require('twit');
const config = require('config');

const T = new Twitter({
	consumer_key: config.get('hooks.botometerAnalyser.twitter.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.twitter.consumer_secret'),
	access_token: config.get('hooks.botometerAnalyser.twitter.access_token'),
	access_token_secret: config.get('hooks.botometerAnalyser.twitter.access_token_secret')
});

module.exports = {
};
