(function(){
	'use strict';
	$(document).ready(function(){
		
		var servers = [];
		var tabs = $('#tabs').tabs();
		
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
				
				function addChannel(server, channel){
					tabs.find('.ui-tabs-nav').append( 
						'<li><a href="#'+server+'_'+channel.replace('#', '')+'">'+channel+'</a><span class="ui-icon ui-icon-close" role="presentation">Remove Tab</span></li>'	
					);
					tabs.append(
						'<div id="'+server+'_'+channel.replace('#', '')+'"></div>' 
					);
					tabs.tabs('refresh');
				}
				
				var JoinChanneldialog = $('#join-channel-dialog').dialog({
			      autoOpen: false,
			      modal: true,
			      buttons: {
			        Add: function() {
			          var server = $(this).find('#new-channel-server').val();
					  var channel = $(this).find('#new-channel').val();
					  socket.emit('join-channel', {server: server, channel: channel});
			          $(this).dialog('close');
			        },
			        Cancel: function() {
			          $(this).dialog('close');
			        }
			      }
			    });
				
				$('#join-channel-button')
			      .button()
			      .click(function() {
					var channelServer = JoinChanneldialog.find('#new-channel-server');
					channelServer.empty();
					for(var i = 0; i < servers.length; i++){
						channelServer.append('<option value="'+servers[i]._id+'">'+servers[i].host+'</option>');
					}
			        JoinChanneldialog.dialog('open');
			    });
				
				tabs.delegate('span.ui-icon-close', 'click', function() {
			      var href = $(this).closest('li').find('a').attr('href');
				  var panelId = $(this).closest('li').remove().attr('aria-controls');
			      $('#' + panelId ).remove();
				  console.log(panelId);
				  var data = href.split('_'); //TODO: use data- attributes
				  socket.emit('part-channel', {server: data[0], channel: '#'+data[1]});
			      tabs.tabs('refresh');
			    });
				
				socket.on('connection-init', function(data){
					servers = data.servers;
					for(var i = 0; i < data.servers.length;i++){
						var server = data.servers[i];
						for(var j = 0; j < server.channels.length; j++){
							addChannel(server._id, server.channels[j]);
						}
					}
					tabs.tabs('refresh');
				});
				socket.on('new-message', function(data){
					var tab = $('#'+data.server+'_'+data.channel.replace('#', ''));
					console.log(tab);
					tab.append('<p>'+data.sender+' : '+data.text+'</p>');
					console.log(data);
				});
				socket.on('joined-channel', function(data){
					addChannel(data.server, data.channel);
					console.log('joined channel: '+data);
				});
				socket.on('parted-channel', function(data){
					console.log('parted channel: '+data);
				});
				$('#sendMessage').button().click(function(){
					var target = $('.ui-tabs-active').attr('aria-controls').split('_');
					var message =  $('#messageText').val();
					socket.emit('send-message', {server:target[0], channel: '#'+target[1], message: message});
					$('#'+$('.ui-tabs-active').attr('aria-controls')).append('<p>Me : '+message+'</p>');
				});
				$('#logoutBtn').button().click(function(){
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