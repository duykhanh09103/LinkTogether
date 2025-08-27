module.exports = {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        let data = await message.client.db.collection('discord_guild_setting').findOne({ guildID: message.guild.id });
        if (!data) return;
        let allowedChannels = data.allowedChannels;
        if (!allowedChannels.some(item => item.channelID === message.channel.id)) return;
        let isReference = false;
        if(message.reference){isReference = true;}
        message.client.cWS.send(JSON.stringify({
            type: 'messageCreate',
            platform: 'discord',
            data: {
                user: { imageURL: message.author.displayAvatarURL(), username: message.author.username, id: message.author.id },
                content: message.content,
                id: message.id,
                reply: { status: isReference, id: message.reference?.messageId ?? null },
                channel: { name: message.channel.name, id: message.channel.id, code: allowedChannels.find(item => item.channelID === message.channel.id).code },
                attachments: message.attachments,
            }
        })
        );



    }
}