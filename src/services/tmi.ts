import tmi from 'tmi.js'

export default function initTmi(params, handleChatMessage) {
    const client = new tmi.Client({
        channels: [params.userName]
    });
    
    client.connect();
    
    client.on('message', (channel, tags, message, self) => {
        // "Alca: Hello, World!"
        console.log(channel, tags)
        console.log(`${tags['display-name']}: ${message}`);
        handleChatMessage(tags['username'], message)
    });
}