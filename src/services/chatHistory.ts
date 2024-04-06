
import initTmi from '@services/tmi.ts'
import type { ChatRoomParams } from '@types/ChatRoomParams'

const users = {} as {
    [nick: string]: {
        offsetX: number
        lastMessage: number
        style?: string
        hotel?: string
        nick?: string
        figureString?: string
    }
}

const container = document.querySelector(".main-container")

if (!container) throw new Error("Invalid chat history container.")

const VALID_STYLES = ['normal', 'generic', 'bot', 'normal_red', 'normal_blue', 'normal_yellow', 'normal_green', 'normal_grey', 'fortune_teller', 'zombie_hand', 'skeleton', 'normal_sky_blue', 'normal_pink', 'normal_purple', 'normal_dark_yellow', 'normal_dark_turquoise', 'hearts,\ngothicrose', 'piglet', 'sausagedog', 'firingmylazer', 'dragon', 'staff', 'bats', 'console', 'steampunk_pipe', 'storm', 'parrot', 'pirate', 'bot_guide', 'bot_rentable', 'skelestock', 'bot_frank_large', 'notification', 'goat', 'santa', 'ambassador', 'radio', 'snowstorm_red', 'snowstorm_blue', 'nft_habbo_avatar_bronze', 'nft_habbo_avatar_gold', 'nft_habbo_avatar_diamond', 'nft_habbo_avatar_rainbow', 'nft_habbo_avatar_trippy', 'nft_habbo_avatar_ultra_trippy', 'nft_mvhq', 'nft_metakey']

let moveHistoryTick: number
let stopHistoryDelay: number

function getRandomArbitrary(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

async function createMessage(nick: string, text: string) {
    if (!container) throw new Error("Invalid chat history container.")
	const userData = await fetch(`https://www.habbo${(users[nick] && users[nick].hotel) || ""}/api/public/users?name=${(users[nick] && users[nick].nick) || ""}`)
		.then(r => r.json())
		.catch(err => {
			console.error(err)
			return {
				figureString: "hr-3936-53-53.hd-605-1370.ch-665-92.lg-3174-110-110.ha-3541.he-3082-110.ea-3484.fa-3993-92.ca-3131-100-96.cc-3515-110-1408",
			}
		})
	const message = document.createElement('div')
	message.classList.add('message')
	message.classList.add(users[nick] && users[nick].style ? users[nick].style : 'normal')
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

	container.appendChild(message)
	message.style.top = (container.clientHeight - message.clientHeight - 50) + 'px'

	for (const child of container.children) {
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
	stopHistoryDelay = null
}


function isVisible(e) {
	return !!(parseInt(e.style.top) > -e.scrollHeight);
}


function moveHistory() {
    if (!container) throw new Error("Invalid chat history container.")
	for (const child of container.children) {
		if (!isVisible(child)) {
			container.removeChild(child)
		} else {
			child.style.top = (parseInt(child.style.top) - 10) + 'px'
		}

	}
}

function handleChatMessage(user: string, message: string) {
	createMessage(user, message)
}

export default function initChatHistory(params: ChatRoomParams) {
    initTmi(params, handleChatMessage);
}
