Chatbots that help to fight disinformation on Mattermost.

# Integrations

## BotometerAnalyser

Assesses the distribution of robots-like accounts sharing specific content on Twitter. It uses [Botometer](https://botometer.iuni.iu.edu) but instead of analysing one account, it analyses all accounts that have shared specific content.

This integration is called through Mattermost as a _Slash command_ with a search term and returns a distribution of the “botscores”, i.e. the how robot-like the Twitter accounts that have tweeted the search term behave.
As we only use the Twitter [Standard search API](https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets.html), the search is made against a sampling of recent Tweets published in the past 7 days with a mix between recent and popular content.

Example result in Mattermost where a slash command is set up to be used as `/botometer [search term]`:

![Results for #GiletsJaunes](Result%20example.png?raw=true)

# Installation

After cloning the repository, install `cairo`:

On ubuntu:
```
    sudo apt update
    sudo apt install libcairo2-dev libjpeg-dev libgif-dev redis
```

Then:
```
    npm install
```

# Configuration

Configure each hook in the proper environment file, for example in `production.json`:

```json
{
    "hooks": {
        "domain": "https://desinfo.quaidorsay.fr/bots/",
        "botometerAnalyser": {
            "twitter": {
                "consumer_key": "<CONSUMER_KEY>",
                "consumer_secret": "<CONSUMER_SECRET>",
                "access_token": "<ACCESS_TOKEN>",
                "access_token_secret": "<ACCESS_TOKEN_SECRET>"
            },
            "botometer": {
                "consumer_key": "<CONSUMER_KEY>",
                "consumer_secret": "<CONSUMER_SECRET>",
                "access_token_key": "<ACCESS_TOKEN_KEY>",
                "access_token_secret": "<ACCESS_TOKEN_SECRET>",
                "mashape_key": "<MASHAPE_KEY>"
            }
        }
    }
}
```

`hooks.domain`: Base URL used to make distribution graphs available.

# Usage

In order to start a server that responds to incoming requests from a Mattermost instance:

```
    npm start
```

# Dev

Create a file `.env`:
```
TWITTER_CONSUMER_KEY=xxx
TWITTER_CONSUMER_SECRET=xxx
TWITTER_ACCESS_TOKEN_KEY=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx
MASHAPE_KEY=xxx
```

Install `docker`. Run a mattermost image: `docker run --name mattermost-preview -d --publish 8065:8065 --add-host dockerhost:127.0.0.1 mattermost/mattermost-preview`

Access the local mattermost instance at `localhost:8065`. Create a new team, a new channel, an integration (slask command) to `http://host.docker.internal:3000/botometer` (GET). In "system console"/"advanced"/"developer", add the trusted hosts `127.0.0.1 localhost host.docker.internal`.

Install redis and run a server: `redis-server`.

Create the file `config/development.js`:
```
{
    "hooks": {
        "domain": "http://localhost:3000",
        "botometerAnalyser": {
            "mattermost": {
                "token": "xxx"
            }
        },
        "sendToAnalysis": {
            "incomingWebHookUrl": "http://localhost:8065/hooks/xxx",
            "actionUrl": "http://host.docker.internal:3000/media-scale",
            "actionResponseUrl": "http://localhost:8065/hooks/xxx"
        }
    }
}
```

To run the automated tests:
```
npm test
```

To run manual tests:

```
npm start
```


## Linux

The magic hostname `host.docker.internal` does not work on linux systems yet.

Run `docker run --name mattermost-preview -d --publish 8065:8065 --network="host" mattermost/mattermost-preview`, access at address `http://127.0.0.1:8065`, set the integration to `http://127.0.0.1:3000/botometer`.


# License

EUPL v1.2: akin to an AGPL, but more readable and translated and legally binding into all languages of the EU. [Recap](https://choosealicense.com/licenses/eupl-1.2/).
