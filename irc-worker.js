var irc = require('irc');
var _ = require('underscore');
var events = require('events');

var Worker = function(server){
    this._server = server;
    this._client = new irc.Client(server.host, server.nick, {
        channels: server.channels
    });
    
    var _this = this;
    
    this.partChannel = function(channel){
        if(_this._client){
            _this._client.part(channel, function(){});
        }else{
            _this.postError('Client not connected to server');
        }
    };
    
    this.joinChannel = function(channel){
        if(_this._client){
             _this._client.join(channel, function(){});
        }else{
            _this.postError('Client not connected to server');
        }
    };
    
    this.say = function(target, message){
        if(_this._client){
            _this._client.say(target, message);
            _this.emit('message', { //TODO: dirty hax since client doesnt react to own messages
                event: 'message',
                data: {
                    server: _this._server,
                    sender: _this._client.nick,
                    channel: target,
                    message: message
                }
            });
        }else{
            _this.postError('Client not connected to server');
        }
    };
    
    this.stopClient = function(){
        if(_this._client){
            _this._client.disconnect(function(){
                _this.emit('message', {event: 'stopped'});
            });  
        }
    };
    
    this.postError = function(msg){
        _this.emit('message', {
           event: 'error',
           data: {
                msg: msg,
                server: _this._server
           }
        });
    };
   
   
    this._client.addListener('message#', function (sender, channel, message) {
        _this.emit('message', {
            event: 'message',
            data: {
                server: _this._server,
                sender: sender,
                channel: channel,
                message: message
            }
        });
    });
    
    this._client.addListener('pm', function (sender, message) {
        _this.emit('message', {
            event: 'pm',
            data: {
                server: _this._server,
                sender: sender,
                message: message
            }
        });
    });
    
    this._client.addListener('join', function(channel, nick, reason, message) {
        if(nick === _this._client.nick && _.indexOf(_this._server.channels, channel) === -1){
            _this._server.channels.push(channel);
            _this.emit('message', {
               event: 'joined',
               data:{
                   server: _this._server,
                   channel: channel
               } 
            });
        }
        //TODO: add support for updating user list
    });
    
    this._client.addListener('part', function(channel, nick, reason, message) {
        if(nick === _this._client.nick){
            _this._server.channels = _.without(_this._server.channels, channel);
            _this.emit('message', {
               event: 'parted',
               data:{
                   server: _this._server,
                   channel: channel
               } 
            });
        }
        //TODO: add support for updating user list
    });
    
    this._client.addListener('error', function(message) {
        _this.postError(message);
    });
    
};

Worker.prototype = new events.EventEmitter;

Worker.prototype.stop = function(){
    this.stopClient();
};

Worker.prototype.say = function(channel, message){
    this.say(channel, message);
};

Worker.prototype.pm = function(to, message){
    this.say(to, message);
};

Worker.prototype.part = function(channel){
    this.partChannel(channel);
};

Worker.prototype.join = function(channel){
    this.joinChannel(channel);
};

module.exports = Worker;