const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection,EmbedBuilder } = require('discord.js');
require('dotenv').config();
const axios = require('axios');

const { DISCORD_TOKEN: token } = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
],
  allowedMentions: {
    parse: ['users', 'roles']

  }
});

client.commands = new Collection();
client.messageCommands = new Collection();
client.messageAliases = new Collection();
client.shop = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const messageCommandsPath = path.join(__dirname, 'message_commands');
const messageCommandFiles = fs.readdirSync(messageCommandsPath).filter(file => file.endsWith('.js'));
for (const file of messageCommandFiles) {
  const filePath = path.join(messageCommandsPath, file);
  const command = require(filePath);
  if ('execute' in command) {
    client.messageCommands.set(command.name, command);
    if ('aliases' in command) {
      for (const alias of command.aliases) {
        client.messageAliases.set(alias, command.name);
      }
    }
  } else {
    console.log(`[WARNING] The message command at ${filePath} is missing a required "execute" property.`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on('rateLimited', () => {
  process.kill(1);
});
client.on('error', (e) => {
  console.log(e)
});
client.on('debug', (e) => {
  console.log(e)
});

client.login(token);