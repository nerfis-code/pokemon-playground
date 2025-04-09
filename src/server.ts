import WebSocket, { WebSocketServer } from 'ws';
import Playground, { PlayerOptionsExtended, PlaygroundSetupOptions } from './playground';
import { randomUUID } from 'crypto';
import { RandomPlayerAI, SideID } from '@pkmn/sim';
import { ObjectReadWriteStream } from '@pkmn/sim/build/cjs/lib/streams';

const wss = new WebSocketServer({
    port: 8080,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});


wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', (data) => receiveRequest(data.toString(), ws));
});

function receiveRequest(request: string, client: WebSocket) {
    console.log(request);
    const body = request.split('|').filter(str => str.length > 0);
    const type = body[0];
    const data = body[1];

    switch (type) {
        case 'room':
            const roomOptions: RoomOptions = JSON.parse(data);
            Room.create(roomOptions.type);
            break;
        case 'player':
            const playerOptions: PlayerOptionsExtended = JSON.parse(data);
            Room.getInstance().addPlayer(client, playerOptions);
            break;
        case 'action':
            const action = data;
            Room.getInstance().choose(client, action);
            break;
        default:
            client.send('|error|Invalid request');
            break;
    }
}
type RoomOptions = {
    type: RoomTypes
}

const playerIA = {
    random: (streams: ObjectReadWriteStream<string>) => new RandomPlayerAI(streams)
}
type RoomStatus = 'waitingForPlayers' | 'playing' | 'ended' | 'waitingForMoves' /* TODO: add */
type RoomTypes = 'PVP' | 'PVE'
// room
class Room {
    private _id: string
    private static _instance?: Room
    private _numberOfPlayersNeeded: number = 2
    type: RoomTypes
    clients: (WebSocket | RandomPlayerAI)[] = []
    roles: Map<(WebSocket | RandomPlayerAI), SideID>
    playground: Playground
    playgroundSetupOptions: PlaygroundSetupOptions
    began: boolean = false

    pushClients: (client: WebSocket | ((streams: ObjectReadWriteStream<string>) => RandomPlayerAI)) => boolean

    private constructor(type: RoomTypes) {
        this._id = randomUUID()
        this.type = type
        this.roles = new Map()
        this.clients = []
        this.playground = new Playground()
        this.playgroundSetupOptions = {
            formatid: 'gen9ubers',
            players: [],
            connection: this.type === 'PVE' ? 'singleplayer' : 'multiplayer',
            battleType: 'wild'
        }
        this.pushClients = (client: WebSocket | ((streams: ObjectReadWriteStream<string>) => RandomPlayerAI)) => {
            if (client instanceof WebSocket) {
                if (this.type === 'PVE' && this.clients.length > 0) {
                    client.send('|error|Room is private')
                    return false
                }
                if (this.began) {
                    client.send('|error|Room has already began')
                    return false
                }
                if (this.clients.length > this._numberOfPlayersNeeded) {
                    client.send('|error|Room is full')
                    return false
                }
                if (this.roles.has(client)) {
                    client.send('|error|You are already in this room')
                    return false
                }
            }
            const sideId = `p${this.clients.length + 1}`
            const stream = this.playground.getStreamsBySide(sideId as SideID)
            if (client instanceof WebSocket) {
                this.clients.push(client)
                this.roles.set(client, sideId as SideID)
                void (async () => {
                    for await (const chunk of stream) {
                        client.send(chunk);
                    }
                })();
            } else {
                const ai = client(stream)
                this.clients.push(ai)
                this.roles.set(ai, sideId as SideID)
                ai.start()
            }
            return true
        }

    }
    addPlayer(client: WebSocket | ((streams: ObjectReadWriteStream<string>) => RandomPlayerAI), playerOptions: PlayerOptionsExtended) {
        const error = !this.pushClients(client)
        if (error) return
        this.playgroundSetupOptions.players.push(playerOptions)
        if (!playerOptions.bot) this.startudHandler()
    }
    addBot(playerOptions: PlayerOptionsExtended) {
        this.addPlayer(playerIA.random, playerOptions)
    }
    startudHandler() {
        if (this.type === 'PVE') this.addBot({
            'name': 'Bot',
            'bot': true
        })
        if (this.roles.size !== this.clients.length) {
            return
        }
        if (this.clients.length !== this._numberOfPlayersNeeded) {
            return
        }
        this.playground.setup(this.playgroundSetupOptions)
        this.start()
    }
    start() {
        if (this.began) {
            throw new Error('Room has already began')
        }
        this.began = true
    }
    choose(client: WebSocket, action: string) {
        const sideId = this.roles.get(client)
        if (!sideId) {
            client.send('|error|You are not in this room')
            return
        }
        this.playground.execute(sideId, action)

    }
    static create(type: RoomTypes) {
        if (Room._instance) {
            throw new Error('Room is already initialized')
        }
        this._instance = new Room(type)
        return this._instance
    }
    static getInstance() {
        if (!Room._instance) {
            throw new Error('Room is not initialized')
        }
        return Room._instance
    }
}