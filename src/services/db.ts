import { emitStorageChangedEvent } from "@/utils/emitStorageChangedEvent";
import { VALID_STYLES } from "./chatHistory";
import type { HOSTS } from "./habboAPI";

export type Users = {
	[nick: string]: {
		offsetX: number
		lastMessage: number
		style?: string
		hotel?: string
		nick?: string
		figureString?: string
	}
}

export function getUsers() {
	const content = localStorage.getItem("users") ?? "{}"
	let data
	try {
		data = JSON.parse(content)
	} catch (err) {
		data = {}
	}

	return data as Users
}

function saveUsers(users: Users) {
	localStorage.setItem('users', JSON.stringify(users))
}

export async function setBubbleStyle(user: string, style: string) {
	if (VALID_STYLES.includes(style)) {
		const users = getUsers()

		users[user] = {
			...(users[user] || {}),
			style,
		}

		saveUsers(users)
		emitStorageChangedEvent()
	}
}

export async function setLook(user: string, options: { hotel: keyof typeof HOSTS, nick: string } | { figureString: string }) {
	const users = getUsers()

	if ('figureString' in options) {
		users[user] = {
			...(users[user] || {}),
			hotel: undefined,
			nick: undefined,
			figureString: options.figureString,
		}
	} else {
		users[user] = {
			...(users[user] || {}),
			hotel: options.hotel,
			nick: options.nick,
			figureString: undefined,
		}
	}

	saveUsers(users)
	emitStorageChangedEvent()
}