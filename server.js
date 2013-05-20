var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

// We need to use the express framework: have a real web servler that knows how to send mime types etc.
var express=require('express');

// Init globals variables for each module required
var app = express()
  , http = require('http')
  , server = http.createServer()
  , io = require('socket.io').listen(server, { log: false });

// launch the http server on given port
server.listen(port, ipaddr);

var capacity = 4;
var maxScore = 10;

function ScoreData(username, score) {
	this.username = username;
	this.score = score;
}

function ScoreManager(max) {
	this.bestScores = new Array();
	this.addScore = function(score) {
		if (this.bestScores.length == 0) {
			this.bestScores[0] = score;
		} else if (this.bestScores.length == 1) {
			if (score.score < this.bestScores.score) {
				this.bestScores[1] = score;
			} else {
				var tmp = this.bestScores[0];
				this.bestScores[1] = tmp;
				this.bestScores[0] = score;
			}
		} else {
			this.bestScores[this.bestScores.length] = score;
			for (var i=0; i < this.bestScores.length - 1; i++) {
				var max = i;
				for (var j=i+1; j < this.bestScores.length; j++) {
					if (this.bestScores[j].score > this.bestScores[max].score) max = j;
				}
				if (max != i) {
					var tmp = this.bestScores[i];
					this.bestScores[i] = this.bestScores[max];
					this.bestScores[max] = tmp;
				}
			}

		}
		if (this.bestScores.length > max) { 	
			this.bestScores.splice(0,max);
		}
	};
}

function Room(name, capacity, socket) {
	var instance = this;
	this.name = name;
	this.capacity = capacity;
	this.players = new Array();
	this.full = false;
	this.level = 0;
	this.startTime = 0;
	this.currentTime = 0;
	this.timer = setInterval(function() {
		instance.currentTime += 10;
	}, 10);
	this.status = "warmup";
	this.isFull = function() {
		return this.players.length >= this.capacity;
	};
	this.addPlayer = function(player) {
		this.players.push(player);
		if (this.isFull()) this.full = true;
	};
	this.removePlayer = function(username) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].username == username) {
				this.players.splice(i, 1);
			}
		}
		this.full = false;
	};
	this.getPlayer = function(username) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].username == username) {
				return this.players[i];
			}
		}
	};
	this.getIndice = function(username) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].username == username) {
				return i;
			}
		}
	};
	this.levelFinished = function() {
		var count = 0;
		for (var j = 0; j < this.players.length; j++) {
			if (this.players[j].isPlaying && this.players[j].hasFinishedLevel) {
				count++;
			}
		}
		if (this.players.length == 1 && count == 1) {
			return true;
		} else if (this.players.length > 1 && count == (this.players.length - 1)) {
			return true;
		}
		return false;
	};
	this.resetPlayersPosition = function() {
		var playersToReset = new Array();
		for (var j = 0; j < this.players.length; j++) {
			if (this.players[j].isPlaying) playersToReset.push(j);
		}
		switch(playersToReset.length) {
			case 1:
				this.players[playersToReset[0]].x = 50;
				this.players[playersToReset[0]].y = 275;
				break;
			case 2:
				this.players[playersToReset[0]].x = 50;
				this.players[playersToReset[0]].y = 170;
				this.players[playersToReset[1]].x = 50;
				this.players[playersToReset[1]].y = 280;
				break;
			case 3:
				this.players[playersToReset[0]].x = 50;
				this.players[playersToReset[0]].y = 110;
				this.players[playersToReset[1]].x = 50;
				this.players[playersToReset[1]].y = 275;
				this.players[playersToReset[2]].x = 50;
				this.players[playersToReset[2]].y = 440;
				break;
			case 4:
				this.players[playersToReset[0]].x = 50;
				this.players[playersToReset[0]].y = 80;
				this.players[playersToReset[1]].x = 50;
				this.players[playersToReset[1]].y = 210;
				this.players[playersToReset[2]].x = 50;
				this.players[playersToReset[2]].y = 340;
				this.players[playersToReset[3]].x = 50;
				this.players[playersToReset[3]].y = 470;
				break;
			default:
		}
	};
	this.updatePlayersStatus = function() {
		for (var j = 0; j < this.players.length; j++) {
			this.players[j].hasFinishedLevel = false;
			this.players[j].isPlaying = true;
		}
	};
	this.updatePlayerScore = function() {
		var count = 0;
		for (var j = 0; j < this.players.length; j++) {
			if (this.players[j].isPlaying && this.players[j].hasFinishedLevel) {
				count++;
			}
		}
		if (this.players.length == 1) {
			return 1;
		} else {
			return this.players.length - count;
		}
	};
 }


function RoomManager(rooms) {
	var instance = this;
	this.rooms = rooms;
	this.timer = setInterval(function() {instance.updateGameStatus();}, 10);
	this.playerExist = function(username) {
		for (var i = 0; i < this.rooms.length; i++) {
			for (var j = 0; j < this.rooms[i].players.length; j++) {
				if (this.rooms[i].players[j].username == username) {
					return true;
				}
			}
		}
		return false;
	};
	this.setDefaultRoom = function () {
		for (var i = 0; i < rooms.length; i++) {
			if (!rooms[i].isFull()) return i;
		}
		return -1;
	};
	this.switchRoom = function(from, to, username) {
		var tmp = this.rooms[from].getPlayer(username);
		this.rooms[from].removePlayer(username);
		this.rooms[to].addPlayer(tmp);
	};
	this.updateGameStatus = function() {
		for (var i = 0; i < this.rooms.length; i++) {
			if (this.rooms[i].status == "running" && this.rooms[i].levelFinished()) {
				this.rooms[i].currentTime = 0;
				this.rooms[i].status = "score";
				io.sockets.in(i).emit('updateGameStatus', this.rooms[i].status, this.rooms[i].currentTime, this.rooms[i].level);
			} else if (this.rooms[i].status == "score" && this.rooms[i].currentTime > 1500) {
				this.rooms[i].currentTime = 0;
				this.rooms[i].status = "warmup";
				this.rooms[i].level++;
				this.rooms[i].updatePlayersStatus();
				this.rooms[i].resetPlayersPosition();
				io.sockets.in(i).emit('updateGameStatus', this.rooms[i].status, this.rooms[i].currentTime, this.rooms[i].level);
				io.sockets.in(i).emit('updatePlayers', this.rooms[i].players);
			} else if (this.rooms[i].status == "warmup" && this.rooms[i].currentTime > 3000) {
				this.rooms[i].currentTime = 0;
				this.rooms[i].status = "running";
				io.sockets.in(i).emit('updateGameStatus', this.rooms[i].status, this.rooms[i].currentTime, this.rooms[i].level);
			}
		}
	};
}


var players = new Array();

var rooms = new Array();
rooms[0] = new Room("Débutant", capacity);
rooms[1] = new Room("Initié", capacity);
rooms[2] = new Room("Pro", capacity);

roomsmanager = new RoomManager(rooms);

var scoreManager = new ScoreManager(maxScore);

io.sockets.on('connection', function(socket) {

	roomsmanager.updateGameStatus();
	// ajoute un joueur
	socket.on('addplayer', function(player){
		var defaultRoom = roomsmanager.setDefaultRoom();
		if (defaultRoom == -1) {
			socket.emit('serverfull');
		} else {
			if (roomsmanager.playerExist(player.username)) {
				socket.emit('usernameexist');
			} else {
				player.score = 0;
				socket.room = defaultRoom;
				roomsmanager.rooms[socket.room].addPlayer(player);
				socket.join(defaultRoom);
				socket.username = player.username;
				socket.playerID = roomsmanager.rooms[socket.room].getIndice(socket.username);
				if (roomsmanager.rooms[socket.room].status == "running" && roomsmanager.rooms[socket.room].players.length > 1) {
					roomsmanager.rooms[socket.room].players[socket.playerID].isPlaying = false;
				} else if (roomsmanager.rooms[socket.room].players.length == 1) {
					roomsmanager.rooms[socket.room].level = 0;
					roomsmanager.rooms[socket.room].currentTime = 0;
					roomsmanager.rooms[socket.room].status = "warmup";
					roomsmanager.rooms[socket.room].resetPlayersPosition();
				}
				socket.emit('updateRemoteScores', scoreManager.bestScore);
				socket.emit('synchronizeGame', roomsmanager.rooms[defaultRoom].status, roomsmanager.rooms[defaultRoom].currentTime, roomsmanager.rooms[defaultRoom].level, roomsmanager.rooms[socket.room].players, socket.playerID);
				socket.emit('updateRooms', roomsmanager.rooms, socket.room);
				socket.broadcast.to(socket.room).emit('updatePlayers', roomsmanager.rooms[socket.room].players);
				socket.broadcast.emit('broadcastRooms', roomsmanager.rooms);
				socket.emit('connected');
				socket.broadcast.to(socket.room).emit('message', 'SERVER', player.username + " rentre dans ce jeu");
				socket.emit('message', 'SERVER', 'Bienvenue ' + player.username + '!');
			}
		}
	});

	socket.on('message', function(message) {
		socket.emit('message', socket.username, message)
		socket.broadcast.to(socket.room).emit('message', socket.username, message);
	});

	socket.on('switch', function(room) {
		socket.emit('message', 'SERVER', 'vous quittez le jeu "' + roomsmanager.rooms[socket.room].name + '"');
		socket.broadcast.to(socket.room).emit('message', 'SERVER', socket.username + ' quitte ce jeu');
		roomsmanager.switchRoom(socket.room, room, socket.username);
		socket.leave(socket.room);
		// après avoir switché le joueur, on update son ancienne room
		// si il est seul dans la room, lui permet de jouer
		if (roomsmanager.rooms[socket.room].players.length == 1) {
			roomsmanager.rooms[socket.room].resetPlayersPosition();
			roomsmanager.rooms[socket.room].updatePlayersStatus();
		// on verifie qu'il y au moins un joueur entrain de jouer sinon
		} else {
			var count = 0;
			for (var i = 0; i < roomsmanager.rooms[socket.room].players.length; i++) {
				if (roomsmanager.rooms[socket.room].players[i].isPlaying == false) count++;
			}
			if (count == roomsmanager.rooms[socket.room].players.length) {
				roomsmanager.rooms[socket.room].resetPlayersPosition();
				roomsmanager.rooms[socket.room].updatePlayersStatus();
			}
		}
		socket.broadcast.to(socket.room).emit('needPlayerUpdate');
		socket.broadcast.to(socket.room).emit('updatePlayers', roomsmanager.rooms[socket.room].players);
		socket.room = room;
		socket.join(socket.room);
		socket.playerID = roomsmanager.rooms[socket.room].getIndice(socket.username);
		if (roomsmanager.rooms[socket.room].status == "running" && roomsmanager.rooms[socket.room].players.length > 1) {
			roomsmanager.rooms[socket.room].players[socket.playerID].isPlaying = false;
		} else if (roomsmanager.rooms[socket.room].players.length == 1) {
			roomsmanager.rooms[socket.room].level = 0;
			roomsmanager.rooms[socket.room].currentTime = 0;
			roomsmanager.rooms[socket.room].status = "warmup";
			roomsmanager.rooms[socket.room].resetPlayersPosition();
		}
		// synchronisation
		socket.emit('synchronizeGame', roomsmanager.rooms[socket.room].status, roomsmanager.rooms[socket.room].currentTime, roomsmanager.rooms[socket.room].level, roomsmanager.rooms[socket.room].players, socket.playerID);
		// les autres clients se mettent a jour
		socket.broadcast.to(socket.room).emit('updatePlayers', roomsmanager.rooms[socket.room].players);
		// envoi le message de connexion
		socket.emit('message', 'SERVER', 'vous entrez dans le jeu "' + roomsmanager.rooms[socket.room].name + '"');
		socket.broadcast.to(socket.room).emit('message', 'SERVER', socket.username + ' rentre dans ce jeu');
		// met a jour les rooms des autres clients
		socket.emit('updateRooms', roomsmanager.rooms, socket.room);
		socket.broadcast.emit('broadcastRooms', roomsmanager.rooms);
	});

	socket.on('updatePosition', function(x, y, finished) {
		roomsmanager.rooms[socket.room].players[socket.playerID].x = x;
		roomsmanager.rooms[socket.room].players[socket.playerID].y = y;
		roomsmanager.rooms[socket.room].players[socket.playerID].hasFinishedLevel = finished;
		if (roomsmanager.rooms[socket.room].players[socket.playerID].hasFinishedLevel) {
			roomsmanager.rooms[socket.room].players[socket.playerID].score += roomsmanager.rooms[socket.room].updatePlayerScore();
		}
		socket.broadcast.to(socket.room).emit('updatePosition', x, y, finished, roomsmanager.rooms[socket.room].players[socket.playerID].score, socket.playerID);
	});

	socket.on('updatePlayerID', function(){
		socket.playerID = roomsmanager.rooms[socket.room].getIndice(socket.username);
		socket.emit('updatePlayerID', socket.playerID);
	});

	// quitte le serveur de jeu
	socket.on('quit', function() {
		// remove the username from global players list
		var score = new ScoreData(roomsmanager.rooms[socket.room].players[socket.playerID].username, roomsmanager.rooms[socket.room].players[socket.playerID].score);
		scoreManager.addScore(score);

		socket.broadcast.emit('updateRemoteScores', scoreManager.bestScore);
		roomsmanager.rooms[socket.room].removePlayer(socket.username);
		// mise a jour des joueurs de la room
		socket.broadcast.to(socket.room).emit('needPlayerUpdate');
		socket.broadcast.to(socket.room).emit('updatePlayers', roomsmanager.rooms[socket.room].players);
		// echo globally that this client has left
		socket.broadcast.to(socket.room).emit('message', 'SERVER',socket.username + ' quitte le jeu');
		socket.broadcast.to(socket.room).emit('updatePlayers', roomsmanager.rooms[socket.room].players);
		socket.leave(socket.room);
		socket.disconnect();
		// update list of users in chat, client-side
		io.sockets.emit('broadcastRooms', roomsmanager.rooms);
	});
});