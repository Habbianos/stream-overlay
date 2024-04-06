
import initPubsub from '@services/pubsub.ts'
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
import type { ChatRoomParams } from '@types/ChatRoomParams';

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

const VALID_EFFECTS = ['dance.1', 'dance.2', 'dance.3', 'dance.4']

const view = document.querySelector("#root") as HTMLCanvasElement | undefined;

if (view == null) throw new Error("Invalid view");


PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const ROOM_SIZE = 30

const tilemap = `
  ${'00'.padStart(ROOM_SIZE + 1, 'x')}
  ${'000'.padStart(ROOM_SIZE + 1, 'x')}
  ${new Array(ROOM_SIZE - 2)
    .fill(null)
    .map((_, i, a) => (`x`.repeat(a.length - i - 1) + '0000').padEnd(ROOM_SIZE + 3, 'x'))
    .join("\n")}
  ${'00'.padEnd(ROOM_SIZE + 3, 'x')}
`

const application = new PIXI.Application({
  view,
  antialias: false,
  resolution: window.devicePixelRatio,
  autoDensity: true,
  width: 1920,
  height: 500,
  transparent: true,
});
const shroom = Shroom.create({
  application,
  resourcePath: "/resources",
});
const room = Room.create(shroom, {
  tilemap,
});

const grid = parseTileMapString(tilemap).map((row) =>
  row.map((type) => (type !== "x" ? Number(type) : -1))
);

room.x = -32;
room.y = 410;

room.hideWalls = true
room.floorColor = "#4d98e4" // "#989865";
room.floorTexture = loadRoomTexture("/tile.png");

application.stage.addChild(RoomCamera.forScreen(room));

const DANCES = [
  "dance.1",
  "dance.2",
  "dance.3",
  "dance.4",
]

class MiniAvatar {
  static readonly DEFAULT_LOOK = "hd-190-7-.ch-210-66-.lg-270-82-.sh-290-80-.ha-1015-61-61" // "hr-3936-53-53.hd-605-1370.ch-665-92.lg-3174-110-110.ha-3541.he-3082-110.ea-3484.fa-3993-92.ca-3131-100-96.cc-3515-110-1408" // hd-99999-99999

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
  private host: string;
  private name: string;
  private twitchUser: string;
  private figureString: string;
  constructor(host: string, name: string, twitchUser: string, figureString: string) {
    this.host = host;
    this.name = name;
    this.twitchUser = twitchUser;
    this.figureString = figureString
    this.initAvatar(host, name, figureString);

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
  private async initAvatar(host: string, name: string, figureString: string) {
    const userData = figureString ? { figureString } : await fetch(`https://www.habbo${host}/api/public/users?name=${name}`)
      .then(r => r.json())
      .catch(err => {
        console.error(err)
        return {
          figureString: MiniAvatar.DEFAULT_LOOK,
        }
      })

    this.ownAvatar = new Avatar({
      look: userData.figureString,
      direction: 4,
      roomX: MiniAvatar.posX++,
      roomY: MiniAvatar.posY--,
      roomZ: 0,
    });

    room.addRoomObject(this.ownAvatar);

    if (MiniAvatar.posX > ROOM_SIZE) MiniAvatar.posX = 1
    if (MiniAvatar.posY < 1) MiniAvatar.posY = ROOM_SIZE

    this.initMovement();
  }

  private movInterval = 0;
  private idleTimeout = 0;
  private exitTimeout = 0;
  private initMovement() {
    this.movInterval = window.setInterval(async () => {
      const tile = MiniAvatar.getRandomTile()
      if (!tile) return

      const dist = Math.sqrt((this.ownAvatar.roomX - tile.roomX) ** 2 + (this.ownAvatar.roomY - tile.roomY) ** 2)

      if (dist > 10) return

      this.path = await this.findPath(tile)
    }, 500)
    this.ownAvatar.removeAction(AvatarAction.Sleep)
    this.ownAvatar.removeAction(AvatarAction.Sit)
    this.ownAvatar.roomZ = grid[this.ownAvatar.roomX][this.ownAvatar.roomY]
    this.ownAvatar.effect = DANCES[Math.floor(Math.random() * DANCES.length)];

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
        room.removeRoomObject(this.ownAvatar)
        delete users[this.twitchUser];
      // }, 1000)
    }, 1 * 60 * 60 * 1000)
  }
  refreshIdle(host?: string, name?: string, figureString?: string) {
    clearTimeout(this.idleTimeout)
    clearTimeout(this.exitTimeout)
    this.idleTimeout = window.setTimeout(() => {
      this.stopMovement()
    }, 15 * 60 * 1000)

    if (this.ownAvatar.effect == undefined)
      this.initMovement()

    if (host && name) {
      (figureString ? Promise.resolve({ figureString }) : fetch(`https://www.habbo${host}/api/public/users?name=${name}`)
        .then(r => r.json())
        .catch(err => {
          console.error(err)
          return {
            figureString: MiniAvatar.DEFAULT_LOOK,
          }
        }))
        .then(userData => {
          if (this.ownAvatar.look === userData.figureString) return

          // this.ownAvatar.look = userData.figureString // TODO: look is readonly
          room.removeRoomObject(this.ownAvatar)
          const effect = this.ownAvatar.effect

          this.ownAvatar = new Avatar({
            look: userData.figureString,
            direction: this.ownAvatar.direction,
            roomX: this.ownAvatar.roomX,
            roomY: this.ownAvatar.roomY,
            roomZ: this.ownAvatar.roomZ,
          });

          this.ownAvatar.effect = effect

          room.addRoomObject(this.ownAvatar);
        })
      
    }
  }

  static getRandomTile(): { roomX: number; roomY: number, tile: number } | null{
    let x = Math.floor(Math.random() * grid.length)
    if (!grid[x]) return null
    let y = Math.floor(Math.random() * grid[x].length)
    if (grid[x][y] == -1) return null
  
    return {
      roomX: x,
      roomY: y,
      tile: grid[x][y],
    }

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

      easystar.setGrid(grid);
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

            const tile = room.getTileAtPosition(position.x, position.y);

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

  setEffect(effectId: string) {
    this.ownAvatar.effect = effectId
  }
}

const users_: {[name: string]: MiniAvatar} = {}
function addPlayer(host: string, name: string, twitchUser: string, figureString: string) {
  if (users_[twitchUser]) {
    users_[twitchUser].refreshIdle(host, name, figureString)
    return
  }

  users_[twitchUser] = new MiniAvatar(host, name, twitchUser, figureString)
}

function processAction(data: any) {
  if (data.action === 'addPlayer') {
    addPlayer(data.host, data.name, data.twitchUser, data.figureString)
  } else if (data.action === 'setEffect') {
    const user = users_[data.twitchUser]
    if (user) user.setEffect(data.effectId)
  } else {
    console.error('unimplemented data handler', data)
  }
}

const ACTIONS = {
	visual: (user, message) => {
		const cmd = message.split(" ")
		if (!cmd.length) return
		if (cmd[1]) {
			users[user] = {
				...(users[user] || {}),
				hotel: cmd[0],
				nick: cmd[1],
			}
			// logUsers()
		} else {
			users[user] = {
				...(users[user] || {}),
				figureString: cmd[0],
				hotel: undefined,
				nick: undefined,
			}
			// logUsers()
		}
		updateAvatar(user)
	},
	estilo: (user, message) => {
		const cmd = message.split(" ")

		if (cmd.length && VALID_STYLES.includes(cmd[0])) {
			users[user] = {
				...(users[user] || {}),
				style: cmd[0],
			}
			// logUsers()
			updateAvatar(user)
		}
	},
	efeito: (user, message) => {
		const cmd = message.split(" ")

		if (cmd.length) {
			setEffect(user, cmd[0])
		}
	}
} as { [action: string]: (user:string, message: string) => void }

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

export default function initRoomVis(params: ChatRoomParams) {
    initPubsub(params, (user, reward, message) => {
        const actionName = Object.keys(ACTIONS).find(a => params[a] === reward)
        if (actionName && typeof ACTIONS[actionName] === 'function') {
            ACTIONS[actionName](user, message)
        }
    })
}
    