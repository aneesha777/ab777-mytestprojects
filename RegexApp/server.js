var controllers = require('./controllers');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

// With Vash view engine
app.set("view engine", "vash");

// Allow express to parse request bbody
app.use(bodyParser.urlencoded({ extended: false }));

controllers.init(app);

var http = require('http');
var port = process.env.port || 1337;
var server = http.createServer(app);
server.listen(port);

