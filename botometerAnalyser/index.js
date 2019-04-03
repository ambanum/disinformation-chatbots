const debug = require('debug')('index');
const config = require('config');
const Twitter = require('twit');
const Botometer = require('node-botometer');
const cache = require('./cache.js');
const graph = require('./graph.js');

const T = new Twitter({
	consumer_key: config.get('hooks.botometerAnalyser.twitter.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.twitter.consumer_secret'),
	access_token: config.get('hooks.botometerAnalyser.twitter.access_token'),
	access_token_secret: config.get('hooks.botometerAnalyser.twitter.access_token_secret')
});

const B = new Botometer({
	consumer_key: config.get('hooks.botometerAnalyser.botometer.consumer_key'),
	consumer_secret: config.get('hooks.botometerAnalyser.botometer.consumer_secret'),
	access_token_key: config.get('hooks.botometerAnalyser.botometer.access_token_key'),
	access_token_secret: config.get('hooks.botometerAnalyser.botometer.access_token_secret'),
	app_only_auth: true,
	mashape_key: config.get('hooks.botometerAnalyser.botometer.mashape_key'),
	rate_limit: 0,
	log_progress: false,
	include_user: true,
	include_timeline: false,
	include_mentions: false
});

function analyze(searchedTerm) {
    return new Promise((resolve, reject) => {
        const twitterParams = {
            count: config.get('hooks.botometerAnalyser.searchCount'),
            q: searchedTerm,
        };
    
        return T.get('search/tweets', twitterParams, function(error, tweets, response) {
            if (error) {
                return reject(error);
            }
        
            const now = new Date().getTime();
            const yesterday = now - (config.get('hooks.botometerAnalyser.nbDay') * 24 * 3600 * 1000);
            const lastDayTweets = tweets.statuses.filter(tweet => yesterday - new Date(tweet.created_at) < 0);
        
            const totalRetweetCount = lastDayTweets.reduce((accumulator, currentValue) => accumulator + currentValue.retweet_count, 0);
            const totalFavoriteCount = lastDayTweets.reduce((accumulator, currentValue) => accumulator + currentValue.favorite_count, 0);
        
            let users = [];
        
            lastDayTweets.forEach((tweet) => {
                users.push(tweet.user.screen_name);
        
                if (!tweet.retweet_count) {
                    return;
                }
        
                T.get(`statuses/retweets/${tweet.id_str}`, {
                    count: 100
                }, function(error, retweets, response) {
                    if (error) {
                        return reject(error);
                    }
        
                    const retweetsUsers = retweets.map((retweet) => retweet.user.screen_name);
                    retweetsUsers.forEach((retweetsUser) => users.push(retweetsUser));
                });
            });
        
            console.log(`In the last ${config.get('hooks.botometerAnalyser.nbDay') > 1 ? `${config.get('hooks.botometerAnalyser.nbDay')} days` : 'day'}`);
            console.log('Number of tweets containing this search:', lastDayTweets.length);
            console.log('Number of retweets for tweets containing this search:', totalRetweetCount);
            console.log('Number of likes for tweets containing this search:', totalFavoriteCount);
        
            debug('Users:', users);
        
            const cachedUsersScore = [];
            const unscoredUsers = [];
        
            users.forEach((user) => {
                const cachedUserScore = cache.getUserScore(user);
                if (typeof cachedUserScore !== 'undefined') {
                    cachedUsersScore.push({
                        name: user,
                        score: cachedUserScore
                    })
                } else {
                    unscoredUsers.push(user)
                }
            });
            debug('Cached users scores', cachedUsersScore);
            debug('Unscored users', unscoredUsers);
        
            // Remove duplicate for botometer API request
            const uniqueUnscoredUsers = [...new Set(unscoredUsers)];
        
            // check users botscore
            B.getBatchBotScores(uniqueUnscoredUsers, data => {
                const freshUsersScores = data.map((d) => {
                    return {
                        name: d.user.screen_name,
                        score: d.botometer.display_scores.universal
                    }
                });
                freshUsersScores.forEach(userScore => {
                    cache.addUserScore(userScore.name, userScore.score);
                });
                debug('Fresh users scores', freshUsersScores);
        
                console.log();
                allUsersScore = cachedUsersScore.concat(freshUsersScores);
                allUsersScore.forEach(userScore => {
                    cache.addUserScore(userScore.name, userScore.score);
                    console.log(`User ${userScore.name} has the botometer score: ${userScore.score}`)
                });
        
                const scores = allUsersScore.map((user) => user.score);
                const uniqueUserScores = allUsersScore.filter((userScore, index, self) =>
                        index === self.findIndex((uS) => uS.name === userScore.name)
                    ).map((user) => user.score);
        
                debug('scores', scores);
                debug('uniqueUserScores', uniqueUserScores);
        
                const sharesPercentage = percentages(scores);
                const usersPercentage = percentages(uniqueUserScores);
        
                console.log();
                console.log(`With search "${searchedTerm}" on all publications and shares`);
                console.log('On all shares:');
                console.log(` ${sharesPercentage.percentageBot}% have a high probability to be made by bots`);
                console.log(` ${sharesPercentage.percentageHuman}% have a high probability to be made by humans`);
                console.log('On all users:');
                console.log(` ${usersPercentage.percentageBot}% have a high probability to be bots`);
                console.log(` ${usersPercentage.percentageHuman}% have a high probability to be humans`);
        
                graph.generateFromScores(uniqueUserScores, scores)
                    .then((imageFileName) => {
                        console.log("imageFileName", imageFileName);
                        resolve({
                            shares: {
                                total: lastDayTweets.length,
                                percentageUnknown: 100 - (sharesPercentage.percentageBot + sharesPercentage.percentageHuman),
                                percentageBot: sharesPercentage.percentageBot,
                                percentageHuman: sharesPercentage.percentageHuman,
                            },
                            users: {
                                total: users.length,
                                percentageUnknown: 100 - (usersPercentage.percentageBot + usersPercentage.percentageHuman),
                                percentageBot: usersPercentage.percentageBot,
                                percentageHuman: usersPercentage.percentageHuman,
                            },
                            imageUrl: imageFileName
                        });
                    });
            });
        });
    });
}


function percentages(scores) {
	const percentageBot = graph.percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScoreBot'), config.get('hooks.botometerAnalyser.maxScore'));
	const percentageHuman = graph.percentageBetweenValues(scores, config.get('hooks.botometerAnalyser.minScore'), config.get('hooks.botometerAnalyser.maxScoreHuman'));
	return {
		percentageBot,
		percentageHuman
	};
}

module.exports = analyze;