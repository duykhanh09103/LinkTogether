const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { name } = require('../events/messageDelete');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('The channel that you want the bot to check for message')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel that you want the bot to check for message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('code')  
                .setDescription('the code that you want to set for the channel')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const code = interaction.options.getString('code');
        if (!channel.isTextBased()) {
            return interaction.reply({ content: 'Please select a valid text channel.', ephemeral: true });
        }
        const db = interaction.client.db;
        const guildDb = await db.collection('discord_guild_setting').findOne({ guildID: interaction.guild.id });
        if (!guildDb) {
            try {
                await db.collection('discord_guild_setting').insertOne({
                    guildID: interaction.guild.id,
                    allowedChannels: [{channelID:channel.id,code:code}]
                });
                let webhooks = await channel.fetchWebhooks();
                const webhook = webhooks.find(wh => wh.token);

                if (!webhook) {
                    await channel.createWebhook({ name: 'LinkTogether Webhook' })
                }
                interaction.reply({ content: `The channel <#${channel.id}> has been set successfully with code ${code}.`, ephemeral: true });
            }
            catch (error) {
                console.error(error)
                interaction.reply({ content: 'An error occurred while setting the channel.', ephemeral: true });
            }
            return;
        }
        try {
            let webhooks = await channel.fetchWebhooks();
            const webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
                await channel.createWebhook({ name: 'LinkTogether Webhook' });
            }
            if (guildDb.allowedChannels.some(item=>item.channelID === channel.id)) {
                return interaction.reply({ content: `The channel <#${channel.id}> is already set !.`, ephemeral: true });
            }
            await db.collection('discord_guild_setting').updateOne({ guildID: interaction.guild.id }, {
                $push: {
                    allowedChannels: { channelID: channel.id, code: code }
                }
            }, { upsert: true });
            interaction.reply({ content: `The channel <#${channel.id}> has been set successfully with code ${code} .`, ephemeral: true });
        }
        catch (error) {
            console.error(error);
            interaction.reply({ content: 'An error occurred while setting the channel.', ephemeral: true });
        }
    },
};