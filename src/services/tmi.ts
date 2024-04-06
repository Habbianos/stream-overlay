import tmi from 'tmi.js'

type ChatHandlers = {
	onChatMessage: (username: string, message: string) => void
}

export type TmiOptions = {
	userName?: string
}

export default function initTmi(options: TmiOptions, handlers: ChatHandlers) {
	const client = new tmi.Client({
		channels: [options.userName!]
	});
	
	client.connect();
	
	client.on('message', (channel, tags, message, self) => {
		console.log(channel, tags)

		if (tags['username'])
			handlers.onChatMessage(tags['username'], message)
	});
}