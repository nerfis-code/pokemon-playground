import WebSocket, { WebSocketServer } from 'ws';
import Playground, { PlaygroundSetupOptions } from './playground';

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

var playground = new Playground();
const options: PlaygroundSetupOptions = {
    formatid: 'gen9ubers',
    players: []
}

const sessions = new Map<string, WebSocket>();

function battlewithbot() {
    options.players.push({ name: 'player2', bot: true })
    playground.setup(options)
}

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);


    void (async () => {
        for await (const chunk of playground.getStreams(wss.clients.size)) {
            ws.send(chunk);
        }
    })();

    ws.on('message', function message(data) {
        const res = receiveRequest(data.toString());
        if (typeof res === 'string') {
            sessions.set(res, ws);
            ws.send(`|sideid|${res}|`);
        }
    });

});

function receiveRequest(request: string) {
    console.log(request);
    const body = request.split('|').filter(str => str.length > 0);
    const type = body[0];
    const data = body[1];
    if (type === 'player') {
        options.players.push(JSON.parse(data));
        const sideId = `p${options.players.length}`;
        battlewithbot();
        return sideId;
    }
    else if (type === 'action') {
        playground.run(data);
    }
}
