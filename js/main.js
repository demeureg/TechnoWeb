window.requestAnimFrame = (function(callback){
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback){
        window.setTimeout(callback, 1000 / 60);
    };
})();

var socket = null;

// chargement des images
var player_sprite = new Image();
player_sprite.src = "data/themes/star wars/images/player_sprite.png";
var level1 = new Image();
level1.src = "data/themes/star wars/images/level1_background.png";
var level2 = new Image();
level2.src = "data/themes/star wars/images/level2_background.png";
var level3 = new Image();
level3.src = "data/themes/star wars/images/level3_background.png";

// création des sons
soundManager.setup({
	url: "./js/soundmanager2.swf",
	preferFlash: false,
	debugMode: false,
	onready: function() {
		soundManager.createSound("victoire", "data/themes/star wars/sounds/victoire.mp3");
		soundManager.createSound("rebond", "data/themes/star wars/sounds/rebond.mp3");
	},
	ontimeout: function() {
		console.log("Error loading soundManager");
	}
});


var username = prompt("Entrer votre pseudo :");
var player = new Player(username, 50, 275, 50, 50, "red");
var scoreManager = new ScoreManager(10);
var online = false;
var roomID = 0;

var targets = new Array();
targets[0] = new Target(610, 300, 75, "black");

var obstacles1 = new Array();

var obstacles2 = new Array();
obstacles2[0] = new Obstacle(200, 0, 250, 200, "F0E36B");
obstacles2[1] = new Obstacle(200, 400, 250, 200, "F0E36B");

var obstacles3 = new Array();
obstacles3[0] = new Obstacle(200, 100, 50, 50, "black");
obstacles3[1] = new Obstacle(200, 250, 50, 100, "black");
obstacles3[2] = new Obstacle(200, 450, 50, 50, "black");
obstacles3[3] = new Obstacle(325, 50, 50, 150, "black");
obstacles3[4] = new Obstacle(325, 400, 50, 150, "black");
obstacles3[5] = new Obstacle(450, 100, 50, 150, "black");
obstacles3[6] = new Obstacle(450, 350, 50, 150, "black");

var levels = new Array();
levels[0] = new Level(obstacles1, targets, level1);
levels[1] = new Level(obstacles2, targets, level2);
levels[2] = new Level(obstacles3, targets, level3);

var game = new LocalGame(player, levels, player_sprite);

function updateStatus(message) {
	var connectionStatus = document.getElementById("status");
	connectionStatus.innerHTML = message;
}

function connect() {

	// sauvegarde automatique du score
	if (!scoreManager.full) {
		score = new ScoreData(username, game.player.score);
		scoreManager.addScore(score);
		if (localStorage) localStorage.setItem("localScores", JSON.stringify(scoreManager.bestScores));
	} else if (scoreManager.getMinScore() < game.player.score) {
		score = new ScoreData(username, game.player.score);
		scoreManager.addScore(score);
		if (localStorage) localStorage.setItem("localScores", JSON.stringify(scoreManager.bestScores));
	}

	// reinitialisation du joueur coté client
	player.score = 0;
	player.x = 50;
	player.y = 275;
	player.hasFinishedLevel = false;

	// connection
	socket = io.connect("http://localhost:8080");

	socket.on('connected', function() {
		online = true;
		var send = document.getElementById("send");
		send.disabled = false;
		send.onclick = function() {
			var message = document.getElementById("message");
			if (message.value != "") {
				socket.emit('message', message.value)
				message.value = "";
			} else {
				alert("champ vide, veuillez entrer un message");
			}
		};
		updateStatus(player.username + ' [<a href="javascript:disconnect();" title="Quitter le jeu en ligne">D&eacute;connexion</a>]');
	});

	socket.on('broadcastRooms', function(rooms) {
		updateRooms(rooms);
	});

	socket.on('synchronizeGame', function(status, currentTime, level, players, playerID) {
		game = new OnlineGame(levels, player_sprite);
		game.status = status;
		game.currentTime = new Date() - currentTime;
		game.currentLevel = level;
		game.players = players;
		game.playerID = playerID;
		updatePlayers();
	});

	socket.on('needPlayerUpdate', function() {
		socket.emit('updatePlayerID');
	});

	socket.on('updateRooms', function(rooms, id) {
		roomID = id;
		updateRooms(rooms);
	});

	socket.on('serverfull', function() {
		alert("Serveur plein ! Veuillez réessayer plus tard.");
		disconnect();
	});

	socket.on('usernameexist', function() {
		player.username = prompt("Le nom d'utilisateur existe deja, veuillez en entrer un nouveau :");
		connect();
	});

	socket.on('updatePlayers', function(players) {
		game.players = players;
		updatePlayers();
	});

	socket.on('updateRemoteScores', function(scores) {
		updateTopScores(scores);
	});

	socket.on('updatePlayerID', function(id) {
		game.playerID = id;
	});

	socket.on('updatePosition', function(x, y, finished, score, i) {
		game.players[i].x = x;
		game.players[i].y = y;
		game.players[i].hasFinishedLevel = finished;
		game.players[i].score = score;
	});

	socket.on('updateGameStatus', function(status, currentTime, level) {	
		game.status = status;
		game.currentLevel = level;
		game.timer = new Date() - currentTime;
	});

	socket.on('message', function(username, message) {
		if (online) {
			var conversation = document.getElementById("conversation");
			conversation.innerHTML += "<span class=\"message\"><span style=\"font-style: bold;\">" + username + "</span>: " + message + "</span><br/>";
		}
	});

	socket.emit('addplayer', player);
}

function disconnect() {
	socket.emit('quit');
	socket.disconnect();
	socket = null;
	game = new LocalGame(player, levels, player_sprite);
	var send = document.getElementById("send");
	send.disabled = true;
	var rooms = document.getElementById("rooms");
	rooms.innerHTML = "";
	var players = document.getElementById("players");
	players.innerHTML = "";
	var conversation = document.getElementById("conversation");
	conversation.innerHTML = "";
	updateStatus(player.username + ' [<a href="javascript:connect();" title="Jouer en ligne avec d\'autre joueurs">Connexion au serveur</a>]');
}

function switchRoom(id) {
	socket.emit('switch', id);
}

function updateRooms(rooms) {
	var div = document.getElementById("rooms");
	var content = '';
	for (var i = 0; i < rooms.length; i++) {
		if (i == roomID || rooms[i].full) content += rooms[i].name + '('+ rooms[i].players.length +')\t';
		else content += '<a href="javascript:switchRoom(' + i + ');">' + rooms[i].name + '('+ rooms[i].players.length +')</a>\t';
	} 
	div.innerHTML = content;
}

function applyTheme(select) {
	var name = select.options[select.selectedIndex].value;
	// récupération des nouvelles images
	player_sprite.src = "data/themes/" + name + "/images/player_sprite.png";
	level1.src = "data/themes/" + name + "/images/level1_background.png";
	level2.src = "data/themes/" + name + "/images/level2_background.png";
	level3.src = "data/themes/" + name + "/images/level3_background.png";

	// mise a jour des images dans les objects
	game.image = player_sprite;
	levels[0].background = level1;
	levels[1].background = level2;
	levels[2].background = level3;

	soundManager.destroySound("victoire");
	soundManager.destroySound("rebond");
	soundManager.createSound("victoire", "data/themes/" + name + "/sounds/victoire.mp3");
	soundManager.createSound("rebond", "data/themes/" + name + "/sounds/rebond.mp3");

	if (name == "bacon story") {
		var div = document.getElementById("theme");
		var content = "<select onchange=\"applyTheme(this)\">";
		content += "<option value=\"star wars\">Star Wars</option>";
		content += "<option value=\"bacon story\" selected>Bacon Story</option>";
		content += "</select>";
		div.innerHTML = content;
	}
	else if (name == "star wars") {
		var div = document.getElementById("theme");
		var content = "<select onchange=\"applyTheme(this)\">";
		content += "<option value=\"star wars\" selected>Star Wars</option>";
		content += "<option value=\"bacon story\">Bacon Story</option>";
		content += "</select>";
		div.innerHTML = content;
	}
}

function updatePlayers() {
	var div = document.getElementById("players");
	var content = '';
	for (var i = 0; i < game.players.length; i++) {
		content += '<span>' + game.players[i].username + '</span><br/>';
	}
	div.innerHTML = content;
}

function updateTopScores(score) {
	var div = document.getElementById("topscores");
	var content = "<a href=\"#\" title=\"Top Scores\n";
	for (var i = 0; i < score.length; i++) {
		content += score[i].username + "\t" + score[i].score + "\n";
	}
	content += "\">Top scores</a>"
	div.innerHTML = content;
}

function loadTheme() {
	var div = document.getElementById("theme");
	var content = "<select onchange=\"applyTheme(this)\">";
	content += "<option value=\"star wars\" selected>Star Wars</option>";
	content += "<option value=\"bacon story\">Bacon Story</option>";
	content += "</select>";
	div.innerHTML = content;
}

window.onload = function() {

	var uiCanvas = document.getElementById("uiCanvas");
	var uiContext = uiCanvas.getContext("2d");
	var backgroundCanvas = document.getElementById("backgroundCanvas");
	var backgroundContext = backgroundCanvas.getContext("2d");
	var playerCanvas = document.getElementById("playerCanvas");
	var playerContext = playerCanvas.getContext("2d");	
	var connectionStatus = document.getElementById("status");

	if (!localStorage) {
		console.log("Votre navigateur ne supporte pas le local storage");
	} else {
		if (localStorage.getItem("localScores")) {
			scoreManager.bestScores = JSON.parse(localStorage.getItem("localScores"));
		}
		updateTopScores(scoreManager.bestScores);
	}

	if (navigator.onLine) {
		connectionStatus.innerHTML = player.username + ' [<a href="javascript:connect();" title="Jouer en ligne avec d\'autre joueurs">Connexion au serveur</a>]';
	} else {
		connectionStatus.innerHTML = player.username + " [Mode hors ligne]";
	}

	function movePlayer(vx, vy) {
		if (game instanceof LocalGame) {
    			if (game.status == "running" && !game.player.hasFinishedLevel) {
    				var hasmoved = game.movePlayer(vx, vy);
    				if (hasmoved && game.player.hasFinishedLevel) soundManager.play("victoire");
    				else if (!hasmoved && !game.player.hasFinishedLevel) soundManager.play("rebond");
    			}
    		} else if (game instanceof OnlineGame) {
    			if (game.status == "running" && !game.players[game.playerID].hasFinishedLevel) {
    				var hasmoved = game.movePlayer(vx, vy);
    				if (hasmoved) {
    					socket.emit('updatePosition', game.players[game.playerID].x, game.players[game.playerID].y, game.players[game.playerID].hasFinishedLevel);
    					if (game.players[game.playerID].hasFinishedLevel) soundManager.play("victoire");
    				} else if (!hasmoved && !game.players[game.playerID].hasFinishedLevel && game.players[game.playerID].isPlaying) soundManager.play("rebond");
    			}
    		}
    	}

	document.onkeydown = function(e) {
		var arrs= [], key= window.event? event.keyCode: e.keyCode;
    	arrs[37]= 'left';
   		arrs[38]= 'up';
    	arrs[39]= 'right';
    	arrs[40]= 'down';
              
    	if(arrs[key] == 'left') {
    		movePlayer(-5,0);
    	} 
    	if(arrs[key] == 'right') {
 			movePlayer(5,0);
    	}
    	if(arrs[key] == 'up') {
   			movePlayer(0,-5);
    	}
    	if(arrs[key] == 'down') {
    		movePlayer(0,5);
      	}
	}

	function drawCanvas() {

		backgroundContext.clearRect(0,0, backgroundCanvas.width, backgroundCanvas.height);
		playerContext.clearRect(0,0, playerCanvas.width, playerCanvas.height);
		uiContext.clearRect(0,0, uiCanvas.width, uiCanvas.height);

		game.draw(backgroundContext, playerContext, uiContext);

		requestAnimationFrame(function() {
			drawCanvas();
		});
	}

	loadTheme();

	drawCanvas();
}

window.onunload = function() {
	if (game instanceof OnlineGame) {
		socket.emit('quit');
		socket.disconnect();
		socket = null;
	} else if (game instanceof LocalGame) {
		var score = new ScoreData(game.player.username, game.player.score);
		scoreManager.addScore(score);
		if (localStorage) localStorage.setItem("localScores", JSON.stringify(scoreManager.bestScores));
	}
}
