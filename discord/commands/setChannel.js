const { SlashCommandBuilder} = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('The channel that you want the bot to check for message')
        .addChannelOption(option => 
            option.setName('channel')
            .setDescription('The channel that you want the bot to check for message')
            .setRequired(true)),
  
	async execute(interaction) {
       const channel = interaction.options.getChannel('channel');
         if (!channel.isTextBased()) {
              return interaction.reply({ content: 'Please select a valid text channel.', ephemeral: true });
         }
         
	},
};