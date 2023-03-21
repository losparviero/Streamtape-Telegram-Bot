# Streamtape Telegram Bot

Download videos from Streamtape in Telegram!

<br>

### Install

1. Clone repo.
2. Run ```npm i``` in project folder.
3. Rename .env.example to .env and provide bot token along with API credentials.
4. Run ```node bot``` to start the bot.

#### Get user & pass from [Streamtape](https://streamtape.com/accpanel).

#### It's advisable to run the bot using PM2 or any startup manager for persistent execution.

###### **Note:** This bot is limited to videos of 50MB size or lower. This is a restriction of the Telegram Bot API and can be bypassed using a client API. However I have not included that code yet. Alternatively, you can create a server and host it there.

<br>

### Uninstall

1. Use ```rm -rf```.

*Note:* If you're unfamiliar with this command, delete project folder from file explorer.

<br>

### Mechanism

The bot uses the [streamtape-dl](https://npmjs.com/streamtape-dl) lib.

<br>

### License

AGPL-3.0 ©️ Zubin