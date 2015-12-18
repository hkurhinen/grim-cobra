(function(){
	'use strict';
	$(document).ready(function(){
		$('#loginBtn').click(function(){
			var socket = io.connect('http://localhost:3000');
			socket.on('connect', function(){
				socket.emit('authentication', {username: $('#usernameInput').val(), password: $('#passwordInput').val()});
				socket.on('authenticated', function() {
					$('#loginForm').hide();
					$('#loggedView').show();
					console.log('authenticated');
					//socket.emit('server-added', {host:'irc.freenode.net', port:6667, nick: 'elemirctestuser'});
					//socket.emit('join-channel', {server:'56747966b3a66ccb1e8685e0', channel: '#spudnik-test'});
				});
				socket.on('new-message', function(data){
					$('#messageContainer').append('<p>'+data.sender+' : '+data.text+'</p>');
					console.log(data);
				});
				socket.on('joined-channel', function(data){
					console.log('joined channel: '+data);
				});
				socket.on('parted-channel', function(data){
					console.log('parted channel: '+data);
				});
				$('#sendMessage').click(function(){
					var message =  $('#messageText').val();
					socket.emit('send-message', {server:'56747966b3a66ccb1e8685e0', channel: '#spudnik-test', message: message});
					$('#messageContainer').append('<p>Me : '+message+'</p>');
				});
				$('#logoutBtn').click(function(){
					socket.emit('logout');
				});
			});
			socket.on('disconnect', function(e){
				$('#loggedView').hide();
				$('#loginForm').show();
			});
		});
	});

})();