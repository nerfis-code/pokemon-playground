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
    players: [
        { name: 'player1' },
        { name: 'player2' },
    ]
}



wss.on('connection', function connection(ws) {
    ws.on('error', console.error);


    void (async () => {
        for await (const chunk of playground.getStreams(wss.clients.size)) {
            ws.send(chunk);
        }
    })();
    if (wss.clients.size > 1) playground.setup(options)
    ws.on('message', function message(data) {
        console.log('received: %s', data);
    });

});

