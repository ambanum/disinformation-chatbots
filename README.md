Chatbots that help to fight disinformation on Mattermost.

# Integrations

## BotometerAnalyser

Assesses the distribution of robots-like accounts sharing specific content on Twitter. It uses [Botometer](https://botometer.iuni.iu.edu) but instead of analysing one account, it analyses all accounts that have shared specific content.

This integration is called through Mattermost as a _Slash command_ with a search term and returns a distribution of the “botscores”, i.e. the how robot-like the Twitter accounts that have tweeted the search term behave.
As we only use the Twitter [Standard search API](https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets.html), the search is made against a sampling of recent Tweets published in the past 7 days with a mix between recent and popular content.

Example result in Mattermost where a slash command is set up to be used as `/botometer [search term]`:

![Results for #GiletsJaunes](Result%20example.png?raw=true)

# Installation

After cloning the repository, install dependencies:

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

# License

EUPL v1.2: akin to an AGPL, but more readable and translated and legally binding into all languages of the EU. [Recap](https://choosealicense.com/licenses/eupl-1.2/).
