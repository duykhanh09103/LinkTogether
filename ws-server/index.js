const { WebSocketServer }= require('ws');
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
  console.log('New client connected');
   
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        if(client===ws) continue;
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
