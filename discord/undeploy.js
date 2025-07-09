const { REST, Routes } = require('discord.js');
require('dotenv').config();
const { DISCORD_TOKEN:token, DISCORD_CLIENTID:ClientID } = process.env;
const rest = new REST({ version: '10' }).setToken(token);
rest.put(Routes.applicationCommands(ClientID), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);