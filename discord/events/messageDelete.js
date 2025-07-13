module.exports = {
    name: 'messageDelete',

    async execute(message) {
        if (message.author.bot) return;
        let data = await message.client.db.collection('discord_guild_setting').findOne({ guildID: message.guild.id });
        if (!data) return;
        let allowedChannels = data.allowedChannels
        if (!allowedChannels.some(item => item.channelID === message.channel.id)) return;
        message.client.cWS.send(JSON.stringify({
            type: 'messageDelete',
            platform: 'discord',
            data: {
                user: { imageURL: message.author.displayAvatarURL(), username: message.author.username, id: message.author.id },
                content: message.content,
                id: message.id,
                channel: { name: message.channel.name, id: message.channel.id, code: allowedChannels.find(item => item.channelID === message.channel.id).code },
                attachments: message.attachments
            }
        })
        );



    }
}