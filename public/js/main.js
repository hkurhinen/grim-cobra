(function(){
	'use strict';
	$(document).ready(function(){
		
	 var newServerDialog = '<div class="form-horizontal">'+
						'  <div class="form-group">'+
						'    <label for="new-server-host" class="col-sm-2 control-label">Host</label>'+
						'    <div class="col-sm-10">'+
						'      <input type="text" class="form-control" id="new-server-host" placeholder="Host">'+
						'    </div>'+
						'  </div>'+
						'  <div class="form-group">'+
						'    <label for="new-server-port" class="col-sm-2 control-label">Port</label>'+
						'    <div class="col-sm-10">'+
						'      <input type="text" class="form-control" id="new-server-port" placeholder="Port">'+
						'    </div>'+
						'  </div>'+
						'  <div class="form-group">'+
						'    <label for="new-server-nick" class="col-sm-2 control-label">Nick</label>'+
						'    <div class="col-sm-10">'+
						'      <input type="text" class="form-control" id="new-server-nick" placeholder="Nick">'+
						'    </div>'+
						'  </div>'+
						'</div>';
		
		var servers = [];
		var socket;
		
		function getServerData(id){
			for(var i = 0; i < servers.length; i++){
				if(servers[i]._id === id){
					return servers[i];
				}
			}
			return null;
		}
		
		function addServer(server){
			$('ul.sidebar-nav').append('<li data-server="'+server._id+'" class="server-container">'+server.host+'<span class="add-channel glyphicon glyphicon-plus"></span><ul></ul></li>');
		}
		
		function addChannel(server, channel){
			$('ul.sidebar-nav').find('.server-container[data-server="'+server+'"] > ul').append( 
				'<li><a class="channel-select" data-server="'+server+'" data-channel="'+channel+'" href="#">'+channel+' <span class="part-channel glyphicon glyphicon-log-out"></span></a></li>'	
			);
			$('.channels').append(
				'<div class="channel" data-server="'+server+'" data-channel="'+channel+'">'+
					'<div class="panel panel-success">' +
					  '<div class="panel-heading"><h3 class="panel-title">'+channel+' @ '+getServerData(server).host+'</h3></div>' +
					  '<div class="channel-messages panel-body"></div>' +
					'</div>' +
				'</div>' 
			);
			socket.emit('get-messages', {server: server, channel: channel});
			handleResize();
			switchChannel(server, channel);
		};
		
		function removeChannel(server, channel){
			$('ul.sidebar-nav').find('.server-container[data-server="'+server+'"] > ul').find('a[data-server="'+server+'"][data-channel="'+channel+'"]').parent().remove();
			$('.channel[data-server="'+server+'"][data-channel="'+channel+'"]').remove();
		}
		
		function switchChannel(server, channel){
			$('#current-nickname').text(getServerData(server).nick+':');
			$('.channel').removeClass('active');
			var messageContainer = $('.channel[data-server="'+server+'"][data-channel="'+channel+'"]');
			messageContainer.addClass('active');
			messageContainer.find('.channel-messages').scrollTop(messageContainer.find('.channel-messages')[0].scrollHeight);
		}
		
		function connectToServer(host, port, nick){
			socket.emit('server-added', {host:host, port:port, nick: nick});
		}
		
		function joinChannel(server, channel){
			socket.emit('join-channel', {server:server, channel: channel});
		}
		
		function partChannel(server, channel){
			socket.emit('part-channel', {server:server, channel: channel});
		}
		
		function handleResize(){
			var messagesHeight = $(window).height() - 200;
			$('.channel-messages').css('height', messagesHeight+'px');
		}
		
		function showConnectToServerDialog(){
			bootbox.dialog({
                title: 'Connect to server',
                message: newServerDialog,
				buttons: {
                    success: {
                        label: "Save",
                        className: "btn-success",
                        callback: function () {
							var host = $('#new-server-host').val();
							var port = $('#new-server-port').val();
							var nick = $('#new-server-nick').val();
							connectToServer(host, port, nick);
                        }
                    }
                }
            });				   
		}
		
		function addMessage(data){
			var sent = moment(data.time);
	        var channel = $('.channel[data-server="'+data.server+'"][data-channel="'+data.channel+'"]');
			channel.find('.panel-body').append('<p>'+sent.format('D.M.YYYY H:M')+' &lt;'+data.sender+'&gt; '+data.text+'</p>');
		}
		
		$(window).resize(function() {
			handleResize();
		});
		
		$('#send-message-button').button().click(function(){
			var target = $('.channel.active');
			var message =  $('#message-content').val();
			socket.emit('send-message', {server:target.attr('data-server'), channel: target.attr('data-channel'), message: message});
			$('#message-content').val('');
		});
		
		$("#menu-toggle").click(function(e) {
	        e.preventDefault();
	        $("#wrapper").toggleClass("toggled");
	    });
		
		$(document).on('click', '.channel-select', function(e){
			e.preventDefault();
			var channel = $(this).attr('data-channel');
			var server = $(this).attr('data-server');
			switchChannel(server, channel);
		});
		
		$(document).on('click', '.add-channel', function(e){
			e.preventDefault();
			var server = $(this).parent().attr('data-server');
			bootbox.prompt('Join channel:', function(channel) {                
				if (channel !== null) {                                             
					joinChannel(server, channel);
				}
			});
		});
		
		$(document).on('click', '.part-channel', function(e){
			e.preventDefault();
			var server = $(this).parent().attr('data-server');
			var channel = $(this).parent().attr('data-channel');
			bootbox.confirm('Part from: '+channel+' @ '+getServerData(server).host+'?', function(result) {
			  if(result){
				  partChannel(server, channel);
			  }
			}); 
		});
		
		
		$('form.login').submit(function(e){
			e.preventDefault();
			var formValues = {};
			$.each(e.target, function(index, field){
				if(typeof($(field).attr('name')) !== 'undefined'){
					formValues[$(field).attr('name')] = $(field).val();
				}
			});
			socket = io.connect('http://localhost:3000');
			socket.on('connect', function(){
				socket.emit('authentication', {username: formValues.username, password: formValues.password});
				socket.on('authenticated', function() {
					$('#login-wrapper').hide( 'puff', {}, 500, function(){
						$('#wrapper').show('puff', {}, 200, function(){});
					});
					//socket.emit('server-added', {host:'irc.freenode.net', port:6667, nick: 'elemirctestuser'});
					//socket.emit('join-channel', {server:'56747966b3a66ccb1e8685e0', channel: '#spudnik-test'});
				});

				socket.on('connection-init', function(data){
					servers = data.servers;
					for(var i = 0; i < data.servers.length;i++){
						var server = data.servers[i];
						addServer(server);
						for(var j = 0; j < server.channels.length; j++){
							addChannel(server._id, server.channels[j]);
						}
					}
					if(!servers || servers.length == 0){
						showConnectToServerDialog();
					}
				});
				
				socket.on('connected-to-server', function(data){
					servers.push(data.server);
					addServer(data.server);
				});
				
				socket.on('new-message', function(data){
					addMessage(data);
				});
				
				socket.on('joined-channel', function(data){
					addChannel(data.server, data.channel);
				});
				
				socket.on('parted-channel', function(data){
					removeChannel(data.server, data.channel);
				});
				
				socket.on('previous-messages', function(data){
					for(var i = 0; i < data.messages.length;i++){
						addMessage(data.messages[i]);
					}
				});
				
				socket.on('file-uploaded', function(data){
					$('#message-content').val(window.location.href+'usercontent/'+data.id);
				});
				
				$('#logoutBtn').button().click(function(){
					socket.emit('logout');
				});
				
				$('#message-content').on('drop', function(e){
					e.stopPropagation();
				    e.preventDefault();
				    var files = e.originalEvent.dataTransfer.files;
					if(files.length > 0){
						for(var i = 0; i < files.length; i++){
							socket.emit('file-upload', {filedata: files[i], filetype: files[i].type, filename: files[i].name});
						}
					}
				});
				
				socket.on('disconnect', function(e){
					$('#loggedView').hide();
					$('#loginForm').show();
				});
			});
		});
	});

})();