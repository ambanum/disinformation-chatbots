const debug = require('debug')('index');
const config = require('config');
const Twitter = require('twit');
const Botometer = require('node-botometer');

const cache = require('./cache');
const graph = require('./graph');
const botometer = require('./botometer');
const utils = require('./utils');

const T = new Twitter({
	consumer_key: config.get('hooks.botometerAnalyser.twitter.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.twitter.consumer_secret'),
	access_token: config.get('hooks.botometerAnalyser.twitter.access_token'),
	access_token_secret: config.get('hooks.botometerAnalyser.twitter.access_token_secret')
});

function analyze(searchedTerm) {
    const twitterParams = {
        count: config.get('hooks.botometerAnalyser.searchCount'),
        q: searchedTerm,
    };

    let result = {};

    return T.get('search/tweets', twitterParams)
        .then((response) => {
            const tweets = response.data.statuses;
            const now = new Date().getTime();
            const before = now - (config.get('hooks.botometerAnalyser.nbDay') * 24 * 3600 * 1000);
            result.lastDayTweets = tweets.filter(tweet => before - new Date(tweet.created_at) < 0);
            result.totalRetweetCount = result.lastDayTweets.reduce((accumulator, currentValue) => accumulator + currentValue.retweet_count, 0);
            result.totalFavoriteCount = result.lastDayTweets.reduce((accumulator, currentValue) => accumulator + currentValue.favorite_count, 0);
        })
        .then(() => {
            result.users = result.lastDayTweets.map((tweet) => tweet.user.screen_name);
            console.log('Number of users (only from search result):', result.users.length);
            
            let promises = [];
            result.lastDayTweets.forEach((tweet) => {
                // if there are no retweets, nothing to do
                if (!tweet.retweet_count) {
                    return;
                }

                // if this is a retweet, adds original tweet's user in the list
                if (tweet.retweeted_status) {
                    result.users.push(tweet.retweeted_status.user.screen_name);
                }

                promises.push(T.get(`statuses/retweets/:id`, { id: tweet.retweeted_status.id_str, count: config.get('hooks.botometerAnalyser.searchCount') })
                    .then((response) => {
                        const retweets = response.data;
                        const retweetsUsers = retweets.map((retweet) => retweet.user.screen_name);
                        retweetsUsers.forEach((retweetsUser) => result.users.push(retweetsUser));
                    })
                    .catch(console.error)
                );
            });

            return Promise.all(promises).catch(console.error);
        })
        .then(() => {
            console.log(`In the last ${config.get('hooks.botometerAnalyser.nbDay') > 1 ? `${config.get('hooks.botometerAnalyser.nbDay')} days` : 'day'}`);
            console.log('Number of tweets containing this search:', result.lastDayTweets.length);
            console.log('Number of retweets for tweets containing this search:', result.totalRetweetCount);
            console.log('Number of likes for tweets containing this search:', result.totalFavoriteCount);
            console.log('Number of users (from tweets and retweets):', result.users.length);

            return botometer.getScores(result.users);
        })
        .then((botometerScores) => {
            result.scores = botometerScores.scores;
            result.uniqueUserScores = botometerScores.uniqueUserScores;
            return graph.generateFromScores(botometerScores.uniqueUserScores, botometerScores.scores);
        })
        .then((imageFileName) => {
            const sharesPercentage = utils.percentages(result.scores);
            const usersPercentage = utils.percentages(result.uniqueUserScores);
            return {
                shares: {
                    total: result.lastDayTweets.length,
                    percentageUnknown: 100 - (sharesPercentage.percentageBot + sharesPercentage.percentageHuman),
                    percentageBot: sharesPercentage.percentageBot,
                    percentageHuman: sharesPercentage.percentageHuman,
                },
                users: {
                    total: result.users.length,
                    percentageUnknown: 100 - (usersPercentage.percentageBot + usersPercentage.percentageHuman),
                    percentageBot: usersPercentage.percentageBot,
                    percentageHuman: usersPercentage.percentageHuman,
                },
                imageUrl: imageFileName
            };
        }).catch(console.error);
}

module.exports = analyze;