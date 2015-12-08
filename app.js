var express = require('express');
var path = require('path');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/grimcobra');

var app = express();

app.set('port', 3000);
app.use(express.static(path.join(__dirname, 'public')));

var http = require('http').Server(app);
var io = require('socket.io')(http);

require('./routes')(app, io);

http.listen(3000, function(){
  console.log('listening on *:3000');
});