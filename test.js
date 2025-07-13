const {WebhookClient} = require('discord.js');
const webhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1393875534026375218/Z5U2ksFJ_MhRX2MzBx7pi-dgWLn40FJ-1xbqVASVSAfI245jd8ebrHAX2J4gQ7HL7_aA" });
const fs = require('fs');
webhook.send({
    content: 'Hello, this is a test message from the webhook!',
    username: 'Webhook Bot',
    files:[{name:'LICENSE.txt', attachment: fs.readFileSync('./LICENSE')}]
})