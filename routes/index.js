var IO;
var async = require('async');
var User = require('../models/user');
var UserFile = require('../models/userFile');
var Worker = require('../irc-worker');
var Message = require('../models/message');
var Server = require('../models/server');
var _ = require('underscore');

var connectedClients = {};
var workers = {};

function handleMessage(data){
	var message = new Message();
	message.server = data.server._id;
	message.sender = data.sender;
	message.channel = data.channel;
	message.time = new Date().getTime();
	message.text = data.message;
	message.save(function(err, message){
		if(_.has(connectedClients, data.server.user)){
			connectedClients[data.server.user].emit('new-message', message);
		}
	});
}

function handlePm(data){
	//TODO: add private message support
}

function handleJoin(data){
	Server.findById(data.server._id, function(err, server){
		server.channels.push(data.channel);
		server.save(function(err, server){
			if(_.has(connectedClients, server.user)){
				connectedClients[server.user].emit('joined-channel', {server:data.server._id,  channel:data.channel});
			}
		});
	});
}

function handlePart(data){
	Server.findById(data.server._id, function(err, server){
		server.channels = _.without(server.channels, data.channel);
		server.save(function(err, server){
			if(_.has(connectedClients, server.user)){
				connectedClients[server.user].emit('parted-channel', {server:data.server._id,  channel:data.channel});
			}
		});
	});
}

function handleNames(data){
  Server.findById(data.server._id, function(err, server){
    if(_.has(connectedClients, server.user)){
    	connectedClients[server.user].emit('names', {server:data.server._id,  channel:data.channel, nicks: data.nicks});
    }
	});
}

function handleUserJoin(data){
  Server.findById(data.server._id, function(err, server){
    if(_.has(connectedClients, server.user)){
    	connectedClients[server.user].emit('user-joined', {server:data.server._id,  channel:data.channel, user: data.user});
    }
	});
}

function handleUserLeft(data){
  Server.findById(data.server._id, function(err, server){
    if(_.has(connectedClients, server.user)){
    	connectedClients[server.user].emit('user-left', {server:data.server._id,  channel:data.channel, user: data.user});
    }
	});
}

function handleError(data){
	console.log('Worker reported error: '+data.msg);
}

function startWorker(server){
	workers[server._id] = new Worker(server);
	workers[server._id].on('message', function(e) {
		var eventType = e.event;
		switch(eventType) {
			case 'message':
			  handleMessage(e.data);
				break;
			case 'pm':
				handlePm(e.data);
				break;
			case 'joined':
				handleJoin(e.data);
				break;
			case 'parted':
				handlePart(e.data);
				break;
      case 'names':
        handleNames(e.data);
        break;
      case 'user-joined':
        handleUserJoin(e.data);
        break;
      case 'user-left':
        handleUserLeft(e.data);
        break;
			default:
				handleError(e.data);
		} 
	});
};

function initWorkers(){
	Server.find({}, function(err, servers){
		if(err){
			console.log('Failed to initialize workers');
		}else{
			for(var i = 0; i < servers.length;i++){
				var server = servers[i];
				startWorker(server);
			}	
		}
	});
};

module.exports = function(app, io){
	IO = io;
	
	initWorkers();
	
	app.get('/', function(req, res){
	  res.sendFile(__dirname + '/index.html');
	});
	
	app.get('/usercontent/:id', function(req, res){
		UserFile.findById(req.params.id, function(err, userFile){
			if(err || !userFile){
				res.status(404).send();
			}else{
				res.contentType(userFile.contentType);
          		res.send(userFile.data);
			}
		})
	});
	
	require('socketio-auth')(IO, {
		authenticate: function(socket, data, callback) {
			var username = data.username;
			var password = data.password;
			
			User.findOne({username:username}, function(err, user){
				if (err || !user) return callback(new Error('User not found'));
				user.validPassword(password, function(err, isValid){
					if(err) return callback(new Error('Wrong password'));
					return callback(null, isValid);
				});
			});
		},
		postAuthenticate: function(socket, data) {
			var username = data.username;
			User.findOne({username:username}, function(err, user){
				socket.client.user = user;
				connectedClients[user._id] = socket;
				
				Server.find({user: user._id}, function(err, servers){
					if(err){
						console.log('Error fetching servers for user');
					}else{
						socket.emit('connection-init', {servers: servers});
					}
				});
				socket.on('file-upload', function(data){
					var userFile = new UserFile();
					userFile.data = data.filedata;
					userFile.contentType = data.filetype;
					userFile.save(function(err, userFile){
						if(err){
							console.log('Error saving file');
						}else{
							socket.emit('file-uploaded', {id: userFile._id});
						}
					});
				});
				socket.on('disconnect', function() {
					delete connectedClients[user._id];
				});
				socket.on('logout', function() {
					socket.disconnect();
				});
				socket.on('server-added', function(data){
					var server = new Server();
					server.host = data.host;
					server.port = data.port;
					server.nick = data.nick;
					server.user = user._id;
					server.channels = [];
					server.save(function(err, server){
						if(err){
							console.log('Error adding server: '+err);
						}else{
							socket.emit('connected-to-server', {server: server});
							startWorker(server);
						}
					})
				});
				socket.on('join-channel', function(data){
					if(typeof(workers[data.server]) !== 'undefined'){
						workers[data.server].join(data.channel);
					}else{
						console.log('Tried to join channel without connecting to server');
					}
				});
				socket.on('part-channel', function(data){
					if(typeof(workers[data.server]) !== 'undefined'){
						workers[data.server].part(data.channel);
					}else{
						console.log('Tried to part channel without connecting to server');
					}
				});
				socket.on('send-message', function(data){
					if(typeof(workers[data.server]) !== 'undefined'){
						workers[data.server].say(data.channel, data.message);
					}else{
						console.log('Tried to send message without connecting to server');
					}
				});
				socket.on('get-messages', function(data){
					Message.find({server:data.server, channel: data.channel})
						.sort({ time: 1 })
						.exec(function(err, messages){
						if(err){
							console.log('Error fetching messages');
						}else{
							socket.emit('previous-messages', {messages: messages});
						}
					});
				});
			});

		},
		timeout: 1000
	});
	
};

