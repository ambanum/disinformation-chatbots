const config = require('config');
const express = require('express');
const router = express.Router();
const request = require('request');

const botometerAnalyser = require('../botometerAnalyser/index');

router.get('/botometer', function(req, res, next) {  
  if (req.query.token !== config.get('hooks.botometerAnalyser.mattermost.token')) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const search = req.query.text;

  if (!search) {
    return res.json({ 
      icon_url: config.get('hooks.botometerAnalyser.mattermost.icon'),
      username: config.get('hooks.botometerAnalyser.mattermost.username'),
      text: `Hey! I can help you by analyzing the latest shares on a specific topic but I need a query.\nSo, give me a keyword, an URL or some text. For example: \n\`/botometer disinformation\``
    });
  }

  res.json({
    response_type: "in_channel", 
    icon_url: config.get('hooks.botometerAnalyser.mattermost.icon'),
    username: config.get('hooks.botometerAnalyser.mattermost.username'),
    text: `Roger! I'm analysing the probability that the accounts (100 max) that have tweeted "${search}" in the past week are robots. This should take 40 minutes max.`
  });

  botometerAnalyser(search)
    .then((result) => {
      request({
        url: req.query.response_url,
        method: "POST",
        json: {
          text: `@${req.query.user_name} Done!`,
          response_type: "in_channel",
          username: config.get('hooks.botometerAnalyser.mattermost.username'),
          icon_url: config.get('hooks.botometerAnalyser.mattermost.icon'),
          "attachments": [
            {
              "title": "During the last week",
              "fields": [
                {
                  "short":false,
                  "title": `On the latest ${result.shares.total} shares of "${search}":`,
                  "value": `**${result.shares.percentageBot}%** have a high probability to be made by bots\n**${result.shares.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.shares.percentageUnknown}%** others it's difficult to say
                  `
                },
                {
                  "short":false,
                  "title": `On the ${result.users.total} users that have shared "${search}" lately:`,
                  "value": `**${result.users.percentageBot}%** have a high probability to be made by bots\n**${result.users.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.users.percentageUnknown}%** others it's difficult to say`
                },
              ],
            },
            {
              "title": "Here is the distribution",
              "title_link": `http://localhost:3000/images/botometerAnalyser/${result.imageUrl}.png`,
              "image_url": `http://localhost:3000/images/botometerAnalyser/${result.imageUrl}.png`
            }
          ]
        },
      });
    });
});

module.exports = router;
