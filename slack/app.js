const { App, subtype } = require('@slack/bolt');
require('dotenv').config();
const { WebSocket} = require('ws');

const ws = new WebSocket(process.env.WS_URL);
ws.on('open', () => {
    app.logger.info('Connected successfully to the Websocket Server!');
});
ws.on('error', (error) => {
    app.logger.error('WebSocket error:', error);
});



const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,

});

app.message(async ({ message, say }) => {
    console.log(message);
});

(async () => {
    await app.start();
    

    app.logger.info('⚡️ Bolt app is running!');
})();