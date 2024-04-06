import * as PIXI from "pixi.js";
import EasyStar from "easystarjs";

import {
	Room,
	Avatar,
	FloorFurniture,
	RoomCamera,
	Shroom,
	loadRoomTexture,
	parseTileMapString,
	AvatarAction,
} from "@jankuss/shroom";
import { getUsers, type Users } from "./db";
import { HOSTS, fetchFigureString } from "./habboAPI";

let users = getUsers() as Users

window.addEventListener("storage", (event) => {
	users = getUsers()

	for (const user in users) {
		updateAvatar(user)
	}
});
class MiniAvatar {
	public static ROOM: Room

	public static GRID: number[][]

	public static DEFAULT_LOOK: string // "hr-3936-53-53.hd-605-1370.ch-665-92.lg-3174-110-110.ha-3541.he-3082-110.ea-3484.fa-3993-92.ca-3131-100-96.cc-3515-110-1408" // hd-99999-99999

	private ownAvatar: Avatar = new Avatar({
		look: MiniAvatar.DEFAULT_LOOK,
		direction: 0,
		roomX: 0,
		roomY: 0,
		roomZ: 0,
	});
	private path: {
		roomX: number;
		roomY: number;
		roomZ: number;
		direction: number | undefined;
	}[] = [];
	private twitchUser: string;

	private readyRes: () => void = () => {}
	public readonly ready: Promise<void>

	constructor(twitchUser: string, options: { hotel: keyof typeof HOSTS, nick: string } | { figureString: string }) {
		if (typeof MiniAvatar.ROOM === 'undefined' || typeof MiniAvatar.GRID === 'undefined' || typeof MiniAvatar.DEFAULT_LOOK === 'undefined')
			throw new Error("MiniAvatar isn't configured correctly.")
		
		this.ready = new Promise(res => this.readyRes = res)

		this.twitchUser = twitchUser;
		this.initAvatar(options);

		setInterval(() => {
			const next = this.path[0];

			if (next != null) {
				this.ownAvatar.walk(next.roomX, next.roomY, next.roomZ, {
					direction: next.direction,
				});

				this.path.shift();
			}
		}, 500);
	}

	static posX = 13 // min 1
	static posY = 18 // max ROOM_SIZE
	private async initAvatar(options: { hotel: keyof typeof HOSTS, nick: string } | { figureString: string }) {
		const userData = await fetchFigureString(options, MiniAvatar.DEFAULT_LOOK)

		const tile = MiniAvatar.getRandomTile()

		this.ownAvatar = new Avatar({
			look: userData.figureString,
			direction: 4,
			roomX: tile.roomX,
			roomY: tile.roomY,
			roomZ: 0,
		});

		MiniAvatar.ROOM.addRoomObject(this.ownAvatar);

		this.initMovement();

		this.readyRes()
	}

	private movInterval = 0;
	private idleTimeout = 0;
	private exitTimeout = 0;
	private initMovement() {
		this.movInterval = window.setInterval(async () => {
			if (this.path.length) return

			const tile = MiniAvatar.__unsafe__getRandomTile()
			if (!tile) return

			const dist = Math.sqrt((this.ownAvatar.roomX - tile.roomX) ** 2 + (this.ownAvatar.roomY - tile.roomY) ** 2)

			if (dist > 10) return

			this.path = await this.findPath(tile)
		}, 500)
		this.ownAvatar.removeAction(AvatarAction.Sleep)
		this.ownAvatar.removeAction(AvatarAction.Sit)
		this.ownAvatar.roomZ = MiniAvatar.GRID[this.ownAvatar.roomX][this.ownAvatar.roomY]
		this.ownAvatar.effect = "dance.1" // DANCES[Math.floor(Math.random() * DANCES.length)];

		this.refreshIdle()
	}
	private stopMovement() {
		clearInterval(this.movInterval)
		this.path = []
		this.ownAvatar.addAction(AvatarAction.Sleep)
		this.ownAvatar.addAction(AvatarAction.Sit)
		this.ownAvatar.roomZ -= 0.5
		this.ownAvatar.effect = undefined

		if (this.ownAvatar.direction % 2 !== 0)
			this.ownAvatar.direction = (this.ownAvatar.direction + 1) % 8

		this.exitTimeout = window.setTimeout(() => {
			// this.ownAvatar.effect = '108' // 'Ninjadisappear'
			// window.setTimeout(() => {
			MiniAvatar.ROOM.removeRoomObject(this.ownAvatar)
			delete users[this.twitchUser];
			// }, 1000)
		}, 1 * 60 * 60 * 1000)
	}
	refreshIdle(hotel?: keyof typeof HOSTS, nick?: string, figureString?: string) {
		clearTimeout(this.idleTimeout)
		clearTimeout(this.exitTimeout)
		this.idleTimeout = window.setTimeout(() => {
			this.stopMovement()
		}, 15 * 60 * 1000)

		if (this.ownAvatar.effect == undefined)
			this.initMovement()

		if (hotel && nick) {
			fetchFigureString({ hotel, nick })
				.then(userData => {
					if (this.ownAvatar.look === userData.figureString) return

					MiniAvatar.ROOM.removeRoomObject(this.ownAvatar)
					const effect = this.ownAvatar.effect

					this.ownAvatar = new Avatar({
						look: userData.figureString,
						direction: this.ownAvatar.direction,
						roomX: this.ownAvatar.roomX,
						roomY: this.ownAvatar.roomY,
						roomZ: this.ownAvatar.roomZ,
					});

					this.ownAvatar.effect = effect

					MiniAvatar.ROOM.addRoomObject(this.ownAvatar);
				})

		}
	}

	static __unsafe__getRandomTile() {
		let x = Math.floor(Math.random() * MiniAvatar.GRID.length)
		if (!MiniAvatar.GRID[x]) return
		let y = Math.floor(Math.random() * MiniAvatar.GRID[x].length)
		if (MiniAvatar.GRID[x][y] == -1) return

		return {
			roomX: x,
			roomY: y,
			tile: MiniAvatar.GRID[x][y],
		}
	}

	static getRandomTile() {
		let tile

		do {
			tile = MiniAvatar.__unsafe__getRandomTile()
		} while (!tile)

		return tile
	}

	static getAvatarDirectionFromDiff(diffX: number, diffY: number) {
		const signX = Math.sign(diffX) as -1 | 0 | 1;
		const signY = Math.sign(diffY) as -1 | 0 | 1;

		switch (signX) {
			case -1:
				switch (signY) {
					case -1:
						return 7;
					case 0:
						return 6;
					case 1:
						return 5;
				}
				break;

			case 0:
				switch (signY) {
					case -1:
						return 0;
					case 1:
						return 4;
				}
				break;

			case 1:
				switch (signY) {
					case -1:
						return 1;
					case 0:
						return 2;
					case 1:
						return 3;
				}
				break;
		}
	}

	private findPath(target: { roomX: number; roomY: number }) {
		return new Promise<
			{
				roomX: number;
				roomY: number;
				roomZ: number;
				direction: number | undefined;
			}[]
		>((resolve) => {
			const easystar = new EasyStar.js();

			easystar.setGrid(MiniAvatar.GRID);
			easystar.setAcceptableTiles([1, 0]);
			easystar.enableDiagonals();

			easystar.findPath(
				this.ownAvatar.roomX,
				this.ownAvatar.roomY,
				target.roomX,
				target.roomY,
				(result) => {
					let currentPosition = {
						x: this.ownAvatar.roomX,
						y: this.ownAvatar.roomY,
					};

					const path: {
						roomX: number;
						roomY: number;
						roomZ: number;
						direction: number | undefined;
					}[] = [];

					result.forEach((position, index) => {
						if (index === 0) return;

						const direction = MiniAvatar.getAvatarDirectionFromDiff(
							position.x - currentPosition.x,
							position.y - currentPosition.y
						);

						const tile = MiniAvatar.ROOM.getTileAtPosition(position.x, position.y);

						if (tile != null) {
							const getHeight = () => {
								if (tile.type === "tile") return tile.z;
								if (tile.type === "stairs") return tile.z + 0.5;

								return 0;
							};

							path.push({
								roomX: position.x,
								roomY: position.y,
								roomZ: getHeight(),
								direction,
							});

							currentPosition = {
								x: position.x,
								y: position.y,
							};
						}
					});

					resolve(path);
				}
			);

			easystar.calculate();
		});
	}

	async setEffect(effectId: string) {
		await this.ready
		this.ownAvatar.effect = effectId
	}
}

const VALID_EFFECTS = ['dance.1', 'dance.2', 'dance.3', 'dance.4']

const DANCES = [
	"dance.1", // Hap-Hop
	"dance.2", // Pogo Mogo
	"dance.3", // Duck Funk
	"dance.4", // Rollie
]

const miniAvatars: { [name: string]: MiniAvatar } = {}
function addPlayer(hotel: keyof typeof HOSTS, nick: string, twitchUser: string, figureString: string) {
	if (miniAvatars[twitchUser]) {
		miniAvatars[twitchUser].refreshIdle(hotel, nick, figureString)
		return
	}

	const options = figureString ? { figureString } : { hotel, nick }

	miniAvatars[twitchUser] = new MiniAvatar(twitchUser, options)
}

function processAction(options: any) {
	if (options.action === 'addPlayer') {
		addPlayer(options.host, options.name, options.twitchUser, options.figureString)
	} else if (options.action === 'setEffect') {
		if (!miniAvatars[options.twitchUser])
			updateAvatar(options.twitchUser)
		miniAvatars[options.twitchUser].setEffect(options.effectId)
	} else {
		console.error('unimplemented action', options)
	}
}

function updateAvatar(user: string) {
	const savedUser = users[user]
	if (savedUser && (savedUser.hotel || savedUser.figureString)) {
		processAction({
			action: "addPlayer",
			host: savedUser.hotel,
			name: savedUser.nick,
			twitchUser: user,
			figureString: savedUser.figureString,
		})
	} else {
		processAction({
			action: "addPlayer",
			twitchUser: user,
		})
	}
}

function setEffect(user: string, effectId: string) {
	processAction({
		action: 'setEffect',
		twitchUser: user,
		effectId,
	})
}

export type RoomVisOptions = {
	defaultLook?: string
	tilemap?: string
	width?: number
	height?: number
	floorColor?: string
	hideWalls?: number
	floorTexture?: number
}

const FLOOR_TEXTURES = ["/textures/floor/tile.png"].map(x => import.meta.env.BASE_URL + x)

export default function initRoomVis(options: RoomVisOptions, container: HTMLCanvasElement) {

	MiniAvatar.DEFAULT_LOOK = options.defaultLook ?? "hd-190-7-.ch-210-66-.lg-270-82-.sh-290-80-.ha-1015-61-61"

	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

	const ROOM_SIZE = 30

	const tilemap = options.tilemap ?? `
	${'00'.padStart(ROOM_SIZE + 1, 'x')}
	${'000'.padStart(ROOM_SIZE + 1, 'x')}
	${new Array(ROOM_SIZE - 2)
			.fill(null)
			.map((_, i, a) => (`x`.repeat(a.length - i - 1) + '0000').padEnd(ROOM_SIZE + 3, 'x'))
			.join("\n")}
	${'00'.padEnd(ROOM_SIZE + 3, 'x')}
`

	const grid = parseTileMapString(tilemap).map((row) =>
		row.map((type) => (type !== "x" ? Number(type) : -1))
	);

	MiniAvatar.GRID = grid

	const application = new PIXI.Application({
		view: container,
		antialias: false,
		resolution: window.devicePixelRatio,
		autoDensity: true,
		width: options.width ?? 1920,
		height: options.height ?? 500,
		transparent: true,
	});
	const shroom = Shroom.create({
		application,
		resourcePath: import.meta.env.BASE_URL + "/resources",
	});
	const room = Room.create(shroom, {
		tilemap,
	});

	MiniAvatar.ROOM = room

	room.x = -32;
	room.y = 410;

	room.hideWalls = !!(options.hideWalls ?? true)
	room.floorColor = options.floorColor ?? "#4d98e4" // "#989865";
	room.floorTexture = loadRoomTexture(FLOOR_TEXTURES[options.floorTexture ?? 0]);

	application.stage.addChild(RoomCamera.forScreen(room));

	return { updateAvatar, setEffect }
}
