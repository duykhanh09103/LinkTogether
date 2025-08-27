const { ActivityType } = require('discord.js');
module.exports = {
    name: 'ready',
    once: true,
    
    async execute(client){
        console.log(`The bot is ready! Logged in as ${client.user.tag}`);
        client.user.setActivity('Linking platform together!',{type:ActivityType.Custom});
    }
}