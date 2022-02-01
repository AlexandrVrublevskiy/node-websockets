const http = require("http");
const https = require("https");
const fs = require("fs");
const basicAuth = require('express-basic-auth')
const express = require( "express");
const WebSocket = require( "ws");
const app = express();
//const server = http.createServer(app);

const options = {
  key: fs.readFileSync("./ssl/priv.key"),
  cert: fs.readFileSync("./ssl/cert.crt"),
};
const httpsServer = https.createServer(options, app);



var winston = require('winston');

 var logger = winston.createLogger({
    level: 'error',
    transports: [
      new (winston.transports.File)({ filename: 'error.log' })
    ]
  });
  
var auth = basicAuth({
		users: { 'ContactCenter': 'CCpwd2022' }
      })
      
var jsonCntCache;
  

app.use(express.static(__dirname + '/'));

app.use(express.json());

const webSocketServer = new WebSocket.Server({ server: httpsServer, path: '/wss' });

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
         /* webSocketServer.clients.forEach(client => {
            client.send(m)
          });*/
          ws.executorId = JSON.parse(m.toString()).executorId;
          //console.log(JSON.parse(m.toString()).executorId);
          webSocketServer.clients.forEach(function each(client) {
            console.log('Executor.ID: ' + client.executorId);
        });
    });

    ws.on("error", e => {
      logger.log('error', e);
    });

    ws.send(jsonCntCache);
});


app.get('/ws', (req, res) => {
      res.sendFile(__dirname + "/index.html");
})

app.post('/api/send-cnt', auth, (req, res) => {
    jsonCntCache = JSON.stringify(req.body);
    webSocketServer.clients.forEach(client => {
    client.send(JSON.stringify(req.body));
    console.log(client);
      if (client.executorId === 41) {
        //webSocketServer.client.executorReqCnt = req.body
      }
    });
    res.sendStatus(200);
})

app.use(function(err, req, res, next) {
  console.error(err.stack);
  logger.log('error', err.stack);
  res.status(500).send('Something broke!');
});

httpsServer.listen(3001, () => console.log("Server started"))
