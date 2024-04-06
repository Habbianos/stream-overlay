import { getUsers, type Users } from "./db";

let users = {} as Users

window.addEventListener("storage", (event) => {
	users = getUsers()
});


let _container = null as HTMLElement | null

export const VALID_STYLES = ['normal', 'generic', 'bot', 'normal_red', 'normal_blue', 'normal_yellow', 'normal_green', 'normal_grey', 'fortune_teller', 'zombie_hand', 'skeleton', 'normal_sky_blue', 'normal_pink', 'normal_purple', 'normal_dark_yellow', 'normal_dark_turquoise', 'hearts,\ngothicrose', 'piglet', 'sausagedog', 'firingmylazer', 'dragon', 'staff', 'bats', 'console', 'steampunk_pipe', 'storm', 'parrot', 'pirate', 'bot_guide', 'bot_rentable', 'skelestock', 'bot_frank_large', 'notification', 'goat', 'santa', 'ambassador', 'radio', 'snowstorm_red', 'snowstorm_blue', 'nft_habbo_avatar_bronze', 'nft_habbo_avatar_gold', 'nft_habbo_avatar_diamond', 'nft_habbo_avatar_rainbow', 'nft_habbo_avatar_trippy', 'nft_habbo_avatar_ultra_trippy', 'nft_mvhq', 'nft_metakey']

let moveHistoryTick: number
let stopHistoryDelay: number
let DEFAULT_LOOK: string

function getRandomArbitrary(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

async function createChatMessage(nick: string, text: string) {
	if (!_container) throw new Error("Invalid chat history container.")

	const userData = await fetch(`https://www.habbo${(users[nick] && users[nick].hotel) || ""}/api/public/users?name=${(users[nick] && users[nick].nick) || ""}`)
		.then(r => r.json())
		.catch(err => {
			console.error(err)
			return {
				figureString: DEFAULT_LOOK,
			}
		})
	const message = document.createElement('div')
	message.classList.add('message')
	message.classList.add((users[nick] && users[nick].style) ? users[nick].style! : 'normal')
	message.innerHTML += `
		<div class="color"></div>
      ${users[nick] && users[nick].hotel ? `<img class="user" src="https://www.habbo.com/habbo-imaging/avatarimage?img_format=png&direction=2&head_direction=2&size=m&headonly=1&figure=${userData.figureString}" />` : ''}
      <span class="nick">${nick}</span><b>:</b> <span class="text">${text}</span>
  `

	let offsetX = users[nick] && users[nick].offsetX && users[nick].lastMessage > Date.now() - 30 * 60 * 1000 ? users[nick].offsetX : getRandomArbitrary(25, 75)
	users[nick] = {
		...(users[nick] || {}),
		offsetX,
		lastMessage: Date.now(),
	}

	message.style.left = offsetX + '%'

	_container.appendChild(message)
	message.style.top = (_container.clientHeight - message.clientHeight - 50) + 'px'

	for (const child of _container.children as HTMLCollectionOf<HTMLElement>) {
		if (child !== message) {
			child.style.top = (parseInt(child.style.top) - message.clientHeight - 5) + 'px'
		}
	}

	if (moveHistoryTick) clearInterval(moveHistoryTick)
	moveHistoryTick = setInterval(moveHistory, 5 * 1000)

	if (stopHistoryDelay) clearTimeout(stopHistoryDelay)
	stopHistoryDelay = setTimeout(stopHistory, 3 * 60 * 1000)

}


function stopHistory() {
	clearInterval(moveHistoryTick)
	stopHistoryDelay = 0
}


function isVisible(e: HTMLElement) {
	return !!(parseInt(e.style.top) > -e.scrollHeight);
}


function moveHistory() {
	if (!_container) throw new Error("Invalid chat history container.")
	for (const child of _container.children as HTMLCollectionOf<HTMLElement>) {
		if (!isVisible(child)) {
			_container.removeChild(child)
		} else {
			child.style.top = (parseInt(child.style.top) - 10) + 'px'
		}

	}
}

export type ChatHistoryOptions = {
	defaultLook?: string
}

export default function initChatHistory(options: ChatHistoryOptions, container: HTMLElement) {
	if (!container) throw new Error("Invalid chat history container.")

	_container = container

	DEFAULT_LOOK = options.defaultLook ?? "hd-190-7-.ch-210-66-.lg-270-82-.sh-290-80-.ha-1015-61-61"

	return { createChatMessage }
}
