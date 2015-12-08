var irc = require('irc');
var _ = require('underscore');

var _client = null;
var _server = null;

var _postError = function(msg){
    postMessage({
       event: 'error',
       data: msg
    });
};

var _startClient = function(server){
    _server = server;
    _client = new irc.Client(server.host, server.nick, {
        channels: server.channels
    });
    _client.addListener('message#', function (sender, channel, message) {
        postMessage({
            event: 'message',
                data: {
                    server: _server._id,
                    sender: sender,
                    channel: channel,
                    message: message
                }
        });
    });
    
    _client.addListener('pm', function (sender, message) {
        postMessage({
            event: 'pm',
                data: {
                    server: _server._id,
                    sender: sender,
                    message: message
                }
        });
    });
    
    _client.addListener('join', function(channel, nick, reason, message) {
        if(nick === _client.nick && _.indexOf(_server.channels, channel) === -1){
            _server.channels.push(channel);
            postMessage({
               event: 'joined',
               data: channel
            });
        }
        //TODO: add support for updating user list
    });
    
    _client.addListener('part', function(channel, nick, reason, message) {
        if(nick === _client.nick){
            _server.channels = _.without(_server.channels, channel);
            postMessage({
               event: 'parted',
               data: channel
            });
        }
        //TODO: add support for updating user list
    });
    
    _client.addListener('error', function(message) {
        _postError(message);
    });
};

var _partChannel = function(channel){
    if(_client){
        _client.part(channel, function(){});
    }else{
        _postError('Client not connected to server');
    }
};

var _joinChannel = function(channel){
    if(_client){
         _client.join(channel, function(){});
    }else{
        _postError('Client not connected to server');
    }
};

var _say = function(target, message){
    if(_client){
         _client.say(target, message);
    }else{
        _postError('Client not connected to server');
    }
};

var _stopClient = function(){
    if(_client){
        _client.disconnect(function(){
            postMessage({event: 'stopped'});
        });  
    }
};

this.onmessage = function (e) {
  var action = e.data.action;
  switch(action) {
    case 'start':
        _startClient(e.data.server);
        break;
    case 'stop':
        _stopClient();
        break;
    case 'say':
        _say(e.data.channel, e.data.message);
        break;
    case 'pm':
        _say(e.data.to, e.data.message);
        break;
    case 'part':
        _partChannel(e.data.channel);
        break;
    case 'join':
        _joinChannel(e.data.channel);
        break;
    default:
        _postError('unknown action: '+action+' requested');
  }
}