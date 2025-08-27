const { App, subtype } = require('@slack/bolt');

require('dotenv').config();
const { WebSocket } = require('ws');
const { MongoClient } = require('mongodb');
const ms = require('ms');

const mongoClient = new MongoClient(process.env.MONGODB_URI);

let db;
mongoClient.connect().then(async () => {
    db = mongoClient.db();
    app.logger.info("Connected to MongoDB");
    await db.collection('slack_messages').createIndex({ "expireAt": 1 }, { expireAfterSeconds: 0 });
});

const ws = new WebSocket(process.env.WS_URL);
ws.on('open', () => {
    app.logger.info('Connected successfully to the Websocket Server!');
});
ws.on('error', (error) => {
    app.logger.error('WebSocket error:', error);
});
ws.on('close', () => {
    app.logger.info('WebSocket connection closed');
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,

});

app.command('/setchannel', async ({ command, ack, respond }) => {
    await ack();
    const channel = command.channel_id;
    let data = await db.collection('slack_setting').findOne({ teamID: command.team_id })
    let code = command.text.trim();
    let channelInfo = await app.client.conversations.info({ channel: channel });
    if (command.user_id !== channelInfo.channel.creator) {
        await respond({ text: 'You do not have permission to set this channel.', response_type: 'ephemeral' });
        return;
    }
    if (!data) {
        try {
            await db.collection('slack_setting').insertOne({
                teamID: command.team_id,
                allowedChannels: [{ channelID: channel, code: code }]
            });
            await respond({ text: `The channel <#${channel}> has been set successfully with code ${code}.`, response_type: 'ephemeral' });
            return;
        }
        catch (error) {
            console.error(error);
            await respond({ text: 'An error occurred while setting the channel.', response_type: 'ephemeral' });
        }
    }
    try {
        if (data.allowedChannels.some(item => item.channelID === channel)) {
            await respond({ text: `The channel <#${channel}> is already set.`, response_type: 'ephemeral' });
            return;
        }
        await db.collection('slack_setting').updateOne({ teamID: command.team_id }, {
            $push: {
                allowedChannels: { channelID: channel, code: code }
            }
        }, { upsert: true });
        await respond({ text: `The channel <#${channel}> has been set successfully with code ${code}.`, response_type: 'ephemeral' });
    }
    catch (error) {
        console.error(error);
        await respond({ text: 'An error occurred while setting the channel.', response_type: 'ephemeral' });
    }
});

app.message(async ({ message, say, client }) => {
    let channelInfo = await app.client.conversations.info({ channel: message.channel });
    let team = message.team ?? channelInfo.channel.context_team_id;
    let data = await db.collection('slack_setting').findOne({ teamID: team });
    if (!data) return;
    if (!data.allowedChannels.some(item => item.channelID === message.channel)) return;

    let code = data.allowedChannels.find(item => item.channelID === message.channel).code;
    if (!message.subtype) {
        const { user } = await client.users.info({ user: message.user });
        let isThread = false
        if(message.thread_ts){isThread = true}
        console.log(user);
        let userImage = user.profile.image_original ?? user.profile.image_192 ?? user.profile.image_48 ?? user.profile.image_24;
        ws.send(JSON.stringify({
            platform: 'slack',
            type: 'messageCreate',
            data: {
                user: { imageURL: userImage, username: user.profile.display_name, id: message.user },
                id: message.ts,
                content: message.text,
                reply: { status: isThread, id: message.thread_ts ?? null },
                channel: { id: message.channel, name: channelInfo.channel.name, code: code },
            }
        }))
        return;
    }
    if (message.subtype === 'file_share') {
        const { user } = await client.users.info({ user: message.user });
        let userImage = user.profile.image_original ?? user.profile.image_192 ?? user.profile.image_48 ?? user.profile.image_24;
        ws.send(JSON.stringify({
            platform: 'slack',
            type: 'messageCreate',
            data: {
                user: { imageURL: userImage, username: user.profile.display_name, id: message.user },
                id: message.ts,
                content: message.text,
                channel: { id: message.channel, name: channelInfo.channel.name, code: code },
                attachments: await getAttachment(message)
            }

        }))
        return;
    }

    if (message.subtype === 'message_changed') {
        const { user } = await client.users.info({ user: message.message.user });
        let userImage = user.profile.image_original?? user.profile.image_192?? user.profile.image_48?? user.profile.image_24;
        ws.send(JSON.stringify({
            platform: 'slack',
            type: 'messageUpdate',
            data: {
                user: { imageURL: userImage, username: user.profile.display_name, id: message.user },
                id: message.message.ts,
                content: message.message.text,
                channel: { id: message.channel, name: channelInfo.channel.name, code: code },
                attachments: await getAttachment(message.message)
            }
        }))
        return;
    }
    if (message.subtype === 'message_deleted') {
        const { user } = await client.users.info({ user: message.previous_message.user });
        let userImage = user.profile.image_original?? user.profile.image_192?? user.profile.image_48?? user.profile.image_24;
        ws.send(JSON.stringify({
            platform: 'slack',
            type: 'messageDelete',
            data: {
                user: { imageURL: userImage, username: user.profile.display_name, id: message.previous_message.user },
                id: message.previous_message.ts,
            }
        }));
        return;
    }

});
async function getAttachment(message) {
    let attachments = [];
    if (!message.files || message.files.length === 0) return undefined;
    for (const file of message.files || []) {
        if (!file.url_private) continue;
        let respond = await fetch(file.url_private, {
            headers: {
                "Content-Type": 'application/json',
                "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                "X-Download-Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
        })
        let buffer = Buffer.from(await respond.arrayBuffer());

        console.log(buffer)
        attachments.push({
            name: file.name,
            attachments: buffer
        })
    }
    return attachments;
}
async function getAttachmentFromWs(attachments) {
    let attachmentArray = [];
    for (const attachment of attachments) {
        if (attachment.url) {
            let respond = await fetch(attachment.url);
            let buffer = Buffer.from(await respond.arrayBuffer());
            attachmentArray.push({
                filename: attachment.name,
                file: buffer
            });
        } else {
            attachmentArray.push({
                filename: attachment.name,
                file: Buffer.from(attachment.attachments.data)
            });
        }
    }
    return attachmentArray;
}
(async () => {
    await app.start();
    app.logger.info('⚡️ Bolt app is running!');

    ws.on('message', async (datas) => {
        const messageData = JSON.parse(datas);
        console.log(messageData);
        let expiryTime = ms("7d");
        let teamData = await db.collection('slack_setting').find({}).toArray();
        if (!teamData) return;
        for (const Team of teamData) {
            if (messageData.type === 'messageCreate') {
                for (const channel of Team.allowedChannels) {
                    if (channel.code !== messageData.data.channel.code) continue;
                    try {
                        let thread_ts = null;
                        if(messageData.data.reply.status){
                            let data = await db.collection('slack_messages').findOne({ originalID: messageData.data.reply.id});
                            if(data){
                                thread_ts = data.messageTS;
                            }
                        }
                        let message = await app.client.chat.postMessage({
                            channel: channel.channelID,
                            text: ">" + messageData.data.content.replace("<", "").replace(">", "").replace("@", "") + `\n Sent from ${messageData.platform} - in channel ${messageData.data.channel.name}`,
                            username: messageData.data.user.username,
                            icon_url: messageData.data.user.imageURL,
                            thread_ts: thread_ts
                        })
                        if (messageData.data.attachments && messageData.data.attachments.length > 0) {
                            await app.client.files.uploadV2({
                                channel_id: channel.channelID,
                                file_uploads: await getAttachmentFromWs(messageData.data.attachments),
                                thread_ts: message.ts,
                            })

                        }
                        await db.collection('slack_messages').insertOne({
                            originalID: messageData.data.id,
                            messageTS: message.ts,
                            channelID: channel.channelID,
                            expireAt: new Date(Date.now() + expiryTime)
                        });
                    }
                    catch (err) { return console.error(`Failed to send message to channel ${channelID}:`, err); }
                }
            }
        }
        if (messageData.type === 'messageUpdate') {
            let data = await db.collection('slack_messages').findOne({ originalID: messageData.data.id });
            if (!data) return;
            console.log(data);
            try {
                await app.client.chat.update({
                    channel: data.channelID,
                    ts: data.messageTS,
                    text: ">" + messageData.data.content.replace("<", "").replace(">", "").replace("@", "") + `\n Sent from ${messageData.platform} - in channel ${messageData.data.channel.name}`,
                });
            }
            catch (error) { return console.error(`Failed to fetch channel or webhook for message update:`, error); }
        }
        if (messageData.type === 'messageDelete') {
            let data = await db.collection('slack_messages').findOne({ originalID: messageData.data.id });
            if (!data) return;
            try {
                await app.client.chat.delete({
                    channel: data.channelID,
                    ts: data.messageTS,
                });
            }
            catch (error) { return console.error(`Failed to delete message in channel ${data.channelID}:`, error); }
        }
    });
})();