const express = require("express");
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const proxy = require('./proxy');
const config = require("./config");
const http = require('http');
const https = require('https');

const pem = proxy.createCert('localhost');

const options = {
  key: pem.private,
  ca: pem.public,
  cert: pem.cert,
  rejectUnauthorized: false,
  requestCert: true,
  agent: false
}

// https server
const app = express();
app.use(bodyParser.json());
app.all('*', proxy.pass);

// http server
const appInsequre = express();
appInsequre.use(bodyParser.json());
appInsequre.all('*', proxy.pass);

// Connect to MongoDB for requests storing
mongoose.connect(config.dbURL, config.dbOptions);
mongoose.connection
  .once('open', () => {
    console.log('Mongo DB connected');

    http.createServer(appInsequre).listen(config.portHttp, () => {
      console.log('HTTP server start on port: ', config.portHttp);
    });

    https.createServer(options, app).listen(config.portHttps, () => {
      console.log('HTTPS server start on port: ', config.portHttps);
    });

  }).on('error', error => console.warn(error));
