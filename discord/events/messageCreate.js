const { Attachment } = require("discord.js");

module.exports = {
    name: 'messageCreate',
    
    async execute(message){  
        await message.client.db.read();
        if(message.author.bot) return;
        if(!message.client.db.data.channels.find((channel)=> channel.id=== message.channel.id )) return;
        console.log(message.attachments)
        message.client.cWS.send(JSON.stringify({
            type:'messageCreate',
            platform: 'discord',
            data:{
                user:{imageURL: message.author.displayAvatarURL(), username: message.author.username, id: message.author.id},
                content: message.content,
                channel: {name: message.channel.name, id: message.channel.id, },
                attachments: message.attachments
            }
        })
    );



    }
}