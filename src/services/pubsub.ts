import generateNonce from '@/utils/generateNonce';

class PubSub {
	heartbeatHandle = 0;
	socket = null as WebSocket | null;
	config = {

	} as { broadcaster: number };

	static eventHandlers = {} as { [topic: string]: (message: any) => void };

	constructor(config: { broadcaster: number }) {
		this.config = config;
	};

	addHandler(topic: string, handler: (message: any) => void) {
		PubSub.eventHandlers[[topic, this.config.broadcaster].join(".")] = handler;
		return this;
	};

	removeHandler(topic: string) {
		delete PubSub.eventHandlers[[topic, this.config.broadcaster].join(".")];
		return this;
	};

	setupListener() {
		if (this.socket && this.socket.readyState != WebSocket.CLOSED) { return; }
		const socket = new WebSocket('wss://pubsub-edge.twitch.tv');
		this.socket = socket
		socket.onopen = event => {
			console.info('PubSub WebSocket connected.');
			this.heartbeatHandle = setInterval(() => {
				socket.send(JSON.stringify({
					type: 'PING'
				}));
			}, 6e4);

			socket.send(JSON.stringify({
				type: 'LISTEN',
				nonce: generateNonce(),
				data: {
					topics: Object.keys(PubSub.eventHandlers),
				}
			}));
		};
		socket.onclose = event => {
			console.info('PubSub WebSocket closed.');
			clearInterval(this.heartbeatHandle);
			setTimeout(() => (console.info('PubSub WebSocket reconnecting...'), this.setupListener()), 3e3);
		};
		socket.onerror = console.error;
		socket.onmessage = event => {
			const eventData = JSON.parse(event.data);
			if (eventData.type == 'MESSAGE') {
				const handler = PubSub.eventHandlers[eventData.data.topic]
				if (typeof handler === 'function') {
					const message = JSON.parse(eventData.data.message);
					handler(message);
				}
			}
		};
	};

	disconnectListener() {
		if (!this.socket || this.socket.readyState == WebSocket.CLOSED) { return; }
		this.socket.close();
	};
};


type TopicsHandlers = {
	onRewardRedeemed: (user: string, reward: string, message: string) => void
}

export type PubsubOptions = {
	userId?: number
}

export default function initPubsub(params: PubsubOptions, handlers: TopicsHandlers) {
	const pubsub = new PubSub({
		broadcaster: params.userId!,
	})

	pubsub
		.addHandler("community-points-channel-v1", event => {
			if (event.type === "reward-redeemed") {
				console.log(event.data.redemption)
				const user = event.data.redemption.user.login
				const reward = event.data.redemption.reward.title
				const message = event.data.redemption.user_input

				handlers.onRewardRedeemed(user, reward, message)
			}
		})

	pubsub.setupListener()
}
