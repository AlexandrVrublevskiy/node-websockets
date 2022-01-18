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

    ws.on("error", e => {
      logger.log('error', e);
    });

    ws.send('{ "start" : "Successful connection to WebSocket server"}');
});

app.get('/ws/', (req, res) => {
      res.sendFile(__dirname + "index.html");
})

app.post('/api/send-cnt', (req, res) => {
    webSocketServer.clients.forEach(client => {
      client.send(JSON.stringify(req.body));
    });
    res.sendStatus(200);
})

app.use(function(err, req, res, next) {
  console.error(err.stack);
  logger.log('error', err.stack);
  res.status(500).send('Something broke!');
});

server.listen(3000, () => console.log("Server started"))