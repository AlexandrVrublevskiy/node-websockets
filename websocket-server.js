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
      
var jsonCntCacheArr = []; //Возможно стоит хранить кеш в SessionStorage браузера
  

app.use(express.static(__dirname + '/'));

app.use(express.json());

const webSocketServer = new WebSocket.Server({ server: httpsServer, path: '/wss' });

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
          let mExecutorId = JSON.parse(m.toString()).executorId
          let executorCacheIndex = jsonCntCacheArr.findIndex(item => item.executorId === mExecutorId);
          ws.executorId = mExecutorId;
          if (executorCacheIndex === -1) {
            ws.send('{"empty": "empty"}')
          } else {
            ws.send(JSON.stringify(jsonCntCacheArr[executorCacheIndex]));
          }
          //console.log(jsonCntCacheArr[executorCacheIndex])
          //console.log(ws.executorId);
    });

    ws.on("error", e => {
      logger.log('error', e);
    });

});


app.get('/ws', (req, res) => {
      res.sendFile(__dirname + "/index.html");
})

app.post('/api/send-cnt', auth, (req, res) => {
    //console.log(webSocketServer.clients);
    webSocketServer.clients.forEach(client => {
      let reqExecutorId = req.body.executorId;
      if (client.executorId === reqExecutorId) {
        let indexToRemove = jsonCntCacheArr.findIndex(item => item.executorId === reqExecutorId);
        if (indexToRemove > -1) {
          jsonCntCacheArr.splice(indexToRemove, 1, req.body)
        } else {
          jsonCntCacheArr.push(req.body);
        }
        //console.log(jsonCntCacheArr);
      }
      client.send(JSON.stringify(req.body));
    });
    res.sendStatus(200);
})

app.use(function(err, req, res, next) {
  console.error(err.stack);
  logger.log('error', err.stack);
  res.status(500).send('Something broke!');
});

httpsServer.listen(3001, () => console.log("Server started on port 3001"))
