var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/grimcobra');

var app = express();

app.set('port', 3000);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});