const { SlashCommandBuilder,PermissionsBitField} = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('The channel that you want the bot to check for message')
        .addChannelOption(option => 
            option.setName('channel')
            .setDescription('The channel that you want the bot to check for message')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  
	async execute(interaction) {
       const channel = interaction.options.getChannel('channel');
         if (!channel.isTextBased()) {
              return interaction.reply({ content: 'Please select a valid text channel.', ephemeral: true });
         }
        const db = interaction.client.db;
        await db.read();
        const exitChannel = db.data.channels.find((c) => c.id === channel.id);
        if (exitChannel) {
            return interaction.reply({ content: `The channel <#${channel.id}> is already set.`, ephemeral: true });
        }
        db.data.channels.push({ id:channel.id });
        await db.write();
        interaction.reply({ content: `The channel <#${channel.id}> has been set successfully.`, ephemeral: true });
	},
};