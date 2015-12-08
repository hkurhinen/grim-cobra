var IO;
var async = require('async');
var User = require('../models/user');
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
		if(connectedClients.indexOf(data.server.user) !== -1){
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
			if(connectedClients.indexOf(server.user) !== -1){
				connectedClients[server.user].emit('joined-channel', data.channel);
			}
		});
	});
}

function handlePart(data){
	Server.findById(data.server._id, function(err, server){
		server.channels = _.without(server.channels, data.channel);
		server.save(function(err, server){
			if(connectedClients.indexOf(server.user) !== -1){
				connectedClients[server.user].emit('parted-channel', data.channel);
			}
		});
	});
}

function handleError(data){
	console.log('Worker reported error: '+data.msg);
}

function initWorkers(){
	User.find({}, function(err, users){
		if(!err){
			async.each(users, function(user, usercb){
				async.each(user.servers, function(server, servercb){
					Server.findById(server, function(err, server){
						if(err){
							servercb(err);
						}else{
							workers[server._id] = new Worker('../irc-worker.js');
							workers[server._id].onmessage = function(e) {
							  var eventType = e.data.event;
							  switch(eventType) {
							  	case 'message':
								  	handleMessage(e.data.data);
									break;
								case 'pm':
									handlePm(e.data.data);
									break;
								case 'joined':
									handleJoin(e.data.data);
									break;
								case 'parted':
									handlePart(e.data.data);
									break;
								default:
									handleError(e.data.data);
								  
							  } 
							};
							workers[server._id].postMessage({action: 'start', server: server});
							servercb();
						}
						
					})

				}, function(err){
					if(err){
						usercb(err);
					}else{
						usercb();
					}
				});
			}, function(err){
				if(err){
					console.log('Failed to initialize workers');
				}
			});
		}
		if(users.length == 0){
			var user = new User({username: 'test', password: 'qwerty'});
			user.save(function(err, user){
				if(!err){
					console.log('successfully created test user');
				}
			})
		}
	});
};

module.exports = function(app, io){
	IO = io;
	
	initWorkers();
	
	app.get('/', function(req, res){
	  res.sendFile(__dirname + '/index.html');
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
			});
		},
		timeout: 1000
	});
	
};

