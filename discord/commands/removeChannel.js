const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { name } = require('../events/messageDelete');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('removechannel')
        .setDescription('The channel that you want the bot to remove')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel that you want the bot to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel')
        if (!channel.isTextBased()) {
            return interaction.reply({ content: 'Please select a valid text channel.', ephemeral: true });
        }
        const db = interaction.client.db;
        const guildDb = await db.collection('discord_guild_setting').findOne({ guildID: interaction.guild.id });
        if (!guildDb) {await interaction.reply({ content: 'No settings found for this server.', ephemeral: true }); return }
        if (!guildDb.allowedChannels.some(item => item.channelID === channel.id)) {
            return interaction.reply({ content: `The channel <#${channel.id}> is not set !.`, ephemeral: true });
        }
        try {
            await db.collection('discord_guild_setting').updateOne({ guildID: interaction.guild.id }, {
                $pull: {
                    allowedChannels: { channelID: channel.id }
                }
            });
            interaction.reply({ content: `The channel <#${channel.id}> has been removed successfully.`, ephemeral: true });
        } 
        catch (error) {
            console.error(error)
            interaction.reply({ content: 'An error occurred while removing the channel.', ephemeral: true });
        }
    },
};