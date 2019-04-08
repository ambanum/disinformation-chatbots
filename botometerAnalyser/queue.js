const config = require('config');
const request = require('request-promise');
const Bull = require('bull');
const analyse = require('./index');

const queue = new Bull('Botometer analysis', {
    limiter: {
        max: 1,
        duration: 1000,
        bounceBack: true,
    }
});

queue.process(async (job) => {
    console.log(`Botometer analyser: Running job for search "${job.data.search}" requested by "${job.data.requesterUsername}"`);
    try {
        return analyse(job.data.search);
    } catch (e) {
        console.error(e);
    }
});

queue.on('completed', (job, result) => {
    console.log(`Botometer analyser: Job completed for search "${job.data.search}" requested by "${job.data.requesterUsername}"`);
    try {
        request({
            url: job.data.responseUrl,
            method: 'POST',
            json: {
                text: `@${job.data.requesterUsername} Done!`,
                response_type: "in_channel",
                username: job.data.botUsername,
                icon_url: job.data.botIconUrl,
                "attachments": [
                    {
                        "title": "During the last week",
                        "fields": [
                            {
                                "short": false,
                                "title": `On the latest ${result.shares.total} shares of "${job.data.search}":`,
                                "value": `**${result.shares.percentageBot}%** have a high probability to be made by bots\n**${result.shares.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.shares.percentageUnknown}%** others it's difficult to say
                    `
                            },
                            {
                                "short": false,
                                "title": `On the ${result.users.total} users that have shared "${job.data.search}" lately:`,
                                "value": `**${result.users.percentageBot}%** have a high probability to be made by bots\n**${result.users.percentageHuman}%** have a high probability to be made by humans\nFor the **${result.users.percentageUnknown}%** others it's difficult to say`
                            },
                        ],
                    },
                    {
                        "title": "Here is the distribution",
                        "title_link": `${config.get('hooks.domain')}/images/botometerAnalyser/${result.imageUrl}.png`,
                        "image_url": `${config.get('hooks.domain')}/images/botometerAnalyser/${result.imageUrl}.png`
                    }
                ]
            },
        })
    } catch (e) {
        console.error(e);
    }
});

module.exports = queue;
