const { SlashCommandBuilder} = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('The delay of the bot to the Discord Server'),
  
	async execute(interaction) {
    await interaction.deferReply({ephemeral: true})
		await interaction.editReply({content:`Its ${interaction.client.ws.ping}ms`, ephemeral: true});
	},
};