(function(){
	'use strict';
	var socket = io.connect('http://localhost:3000');
	socket.on('connect', function(){
	  socket.emit('authentication', {username: "test", password: "qwerty"});
	  socket.on('authenticated', function() {
	    console.log('authenticated');
	  });
	});
})();