module.exports = {
    name: 'messageUpdate',

    async execute(oldMessage, newMessage) {
        if (newMessage.author.bot) return;
        let data = await newMessage.client.db.collection('discord_guild_setting').findOne({ guildID: newMessage.guild.id });
        if (!data) return;
        let allowedChannels = data.allowedChannels;
        if (!allowedChannels.some(item => item.channelID === newMessage.channel.id)) return;
        newMessage.client.cWS.send(JSON.stringify({
            type: 'messageUpdate',
            platform: 'discord',
            data: {
                user: { imageURL: newMessage.author.displayAvatarURL(), username: newMessage.author.username, id: newMessage.author.id },
                content: newMessage.content,
                id: oldMessage.id,
                channel: { name: newMessage.channel.name, id: newMessage.channel.id, code: allowedChannels.find(item => item.channelID === newMessage.channel.id).code },
                attachments: newMessage.attachments
            }
        })
        );



    }
}