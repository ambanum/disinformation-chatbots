
Integration server to add webhooks and slash commands to https://desinfo.quaidorsay.fr's Mattermost

# Integrations

- ## BotometerAnalyser

Assesses the distribution of robots' like accounts sharing specific content on Twitter. It uses [Botometer](https://botometer.iuni.iu.edu) but instead of analysing one account, it analyses a bunch of accounts related to a subject.

This integration is called, through Mattermost as a Slash command, with a search term and returns a distribution about the probability that Twitter's accounts who have tweet the search term are robots.
As we only use the Twitter Standard search API, the search is made against a sampling of recent Tweets published in the past 7 days with a mix between recent and popular content.

An exemple of result in Mattermost where a slash command is configured to be used like this `/botometer [search term]`:
![An exemple of result in Mattermost](Result%20example.png?raw=true)

# Installation

After cloning the repository, install dependencies:

```
    npm install
```

# Configuration

Configure each hooks in the proper environment file, for example in `production.json`:

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
# Usage

As it is designed to receive webhooks or slash commands, a server is needed to accepts incoming request from a Mattermost server and respond to it, so run it like this :

```
    npm start
```