
Integration server to add incoming and outgoing webhooks and slash commands to https://desinfo.quaidorsay.fr's Mattermost

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

Run the server

```
    npm start
```
