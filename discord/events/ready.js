const { ActivityType } = require('discord.js');
import { JSONFilePreset } from 'lowdb/node'
module.exports = {
    name: 'ready',
    once: true,
    
    async execute(client){
        console.log(`The bot is ready! Logged in as ${client.user.tag}`);
        client.user.setActivity('Linking platform together!',{type:ActivityType.Listening});
        const db = await JSONFilePreset('db.json',{ 
            channels: [],
        });
        client.db = db;


    }
}