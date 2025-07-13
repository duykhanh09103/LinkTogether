const path = require('node:path');
const fs = require('node:fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder, WebhookClient } = require('discord.js');
const { WebSocket } = require('ws');
const { MongoClient } = require('mongodb');
const ms = require('ms');
const { get } = require('node:http');
require('dotenv').config();

const { DISCORD_TOKEN: token, MONGODB_URI: mongoURI, WS_URL: wsURL } = process.env;

const mongoClient = new MongoClient(mongoURI);
let db;
mongoClient.connect().then(async () => {
    db = mongoClient.db();
    client.db = db;
    console.log("Connected to MongoDB");
    await db.collection('discord_messages').createIndex({ "expireAt": 1 }, { expireAfterSeconds: 0 })

});
const ws = new WebSocket(wsURL);

if (!token) {
    console.error('Discord token is not defined in the environment variables.');
    process.exit(1);
}
const client = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    ],
    allowedMentions: {
        parse: ['users', 'roles']

    }
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}
client.cWS = ws;
ws.on('open', () => {
    console.log('Connected successfully to the Websocket Server!')
});
ws.on('error', (error) => {
    console.error('WebSocket error:', error);
})
ws.on('message', async (datas) => {
    let expiryTime = ms('7d');
    const messageData = JSON.parse(datas);
    console.log('Received message:', messageData);
    if (messageData.type === 'messageCreate') {
        let data = await client.db.collection('discord_guild_setting').find({}).toArray();
        if (!data || data.length === 0) return;
        for (const guildData of data) {
            let guild = await client.guilds.fetch(guildData.guildID);
            if (!guild) continue;
            for (const channelID of guildData.allowedChannels) {
                let channel = await guild.channels.fetch(channelID);
                let webhooks = await channel.fetchWebhooks();
                const webhook = webhooks.find(wh => wh.token);
                if (!webhook) {
                    await channel.createWebhook({ name: 'LinkTogether Webhook' });
                }
                try {
                    let webhookMessage = await webhook.send({
                        content: messageData.data.content +`\n-# Sent from ${messageData.platform} - in channel ${messageData.data.channel.name}`,
                        username: messageData.data.user.username,
                        avatarURL: messageData.data.user.imageURL,
                        files: getAttachment(messageData.data.attachments),
                    })
                    await client.db.collection('discord_messages').insertOne({
                        originalID: messageData.data.id,
                        channelID: channel.id,
                        guildID: guild.id,
                        messageID: webhookMessage.id,
                        expireAt: new Date(Date.now() + expiryTime)
                    })
                }
                catch (error) {
                    console.error(`Failed to send message to channel ${channelID} in guild ${guild.id}:`, error);
                }
            }
        }
    }
    if (messageData.type === 'messageUpdate') {
        let data = await client.db.collection('discord_messages').findOne({ originalID: messageData.data.id });
        if (!data) return;
        try {
            let guild = await client.guilds.fetch(data.guildID);
            let channel = await guild.channels.fetch(data.channelID);
            let webhooks = await channel.fetchWebhooks();
            const webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
               return;
            }
            webhook.editMessage(data.messageID, {
                content: messageData.data.content+`\n-# Sent from ${messageData.platform} - in channel ${messageData.data.channel.name}`,
                files: getAttachment(messageData.data.attachments),
            });
        }
        catch (error) {
            console.error(`Failed to fetch channel or webhook for message update:`, error);
            return;
        }
    }
    if(messageData.type === 'messageDelete'){
        let data = await client.db.collection('discord_messages').findOne({ originalID: messageData.data.id });
        if (!data) return;
        try {
            let guild = await client.guilds.fetch(data.guildID);
            let channel = await guild.channels.fetch(data.channelID);
            let webhooks = await channel.fetchWebhooks();
            const webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
                return;
            }
            webhook.deleteMessage(data.messageID);
        }
        catch (error) {
            console.error(`Failed to fetch channel or webhook for message delete:`, error);
            return;
        }
    }
});

function getAttachment(attachments){
    if(!attachments || attachments.length === 0) return undefined;
    let attachmentArray = []
    for (const attachment of attachments) {
        if (attachment.url) {
            return attachments;
        }
        else {
            attachmentArray.push({
                name: attachment.name,
                attachment: Buffer.from(attachment.attachments.data)
            })
        }
    }
    return attachmentArray;
}

client.on('rateLimited', () => {
    process.kill(1);
});
client.on('error', (e) => {
    console.log(e)
});
client.on('debug', (e) => {
    console.log(e)
});

client.login(token);