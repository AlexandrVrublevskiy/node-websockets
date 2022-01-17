const http = require("http");
const express = require( "express");
const WebSocket = require( "ws");
const app = express();
const server = http.createServer(app);

var winston = require('winston');

  var logger = winston.createLogger({
    level: 'error',
    transports: [
      new (winston.transports.File)({ filename: 'error.log' })
    ]
  });

app.use(express.static(__dirname + '/'));

app.use(express.json());

const webSocketServer = new WebSocket.Server({ server });

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
          webSocketServer.clients.forEach(client => {
            client.send(m)
          });
    });

    ws.on("error", e => ws.send(e));

    ws.send(JSON.stringify({ "test" : "Hi there, I am a WebSocket server"}));
});

app.get('/ws', (req, res) => {
      res.sendFile(__dirname + "index.html");
  })

app.post('/api/send-cnt', (req, res) => {
    webSocketServer.clients.forEach(client => {
      client.send(JSON.stringify(req.body));
    });
    res.sendStatus(200);
} )

logger.log('error', 'test error message %s', 'my string');


server.listen(3000, () => console.log("Server started"))