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
      
var reqCntCacheExecutors = []; //Хранит текущее кол-во новых и отклоненных обращений по каждому подключенному к вебсокету исполнителю

var reqCntCacheCurrent = {}; //Хранит текущее кол-во обращений по типам запроса на изменение
  

app.use(express.static(__dirname + '/'));

app.use(express.json());

const webSocketServer = new WebSocket.Server({ server: httpsServer, path: '/wss' });

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
          let mExecutorId = JSON.parse(m.toString()).executorId
          let executorCacheIndex = reqCntCacheExecutors.findIndex(item => item.executorId === mExecutorId);
          ws.executorId = mExecutorId;
          if (executorCacheIndex === -1) {
            ws.send('{"cache": "empty"}')
          } else {
            let reqCnt = Object.assign({}, reqCntCacheCurrent)
            reqCnt.data[0].REQ_NEW_FOR_EXECUTOR = reqCntCacheExecutors[executorCacheIndex].reqNewForExecutor
            reqCnt.data[0].REQ_MARK_AS_DISCKARD = reqCntCacheExecutors[executorCacheIndex].reqMarkAsDiscard
            ws.send(JSON.stringify(reqCntCacheCurrent));
          }
          //console.log(reqCntCacheExecutors[executorCacheIndex])
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
        let indexToRemove = reqCntCacheExecutors.findIndex(item => item.executorId === reqExecutorId);
        let execuorData = {
                            executorId: reqExecutorId,
                            reqNewForExecutor: req.body.data[0].REQ_NEW_FOR_EXECUTOR,
                            reqMarkAsDiscard: req.body.data[0].REQ_MARK_AS_DISCKARD
                          }
        if (indexToRemove > -1) {
          reqCntCacheExecutors.splice(indexToRemove, 1, execuorData)
        } else {
          reqCntCacheExecutors.push(execuorData);
        }
        //console.log(reqCntCacheExecutors);
      }
      reqCntCacheCurrent = Object.assign(reqCntCacheCurrent, req.body);
      client.send(JSON.stringify(req.body));
    });
    //console.log(reqCntCacheExecutors);
    res.sendStatus(200);
})

app.use(function(err, req, res, next) {
  console.error(err.stack);
  logger.log('error', err.stack);
  res.status(500).send('Something broke!');
});

httpsServer.listen(3001, () => console.log("Server started on port 3001"))
