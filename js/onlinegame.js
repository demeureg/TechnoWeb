function OnlineGame(levels, image) {
	this.playerID = 0;
	this.players = new Array();
	this.levels = levels; 
	this.currentLevel = 0;
	this.timer = new Date();
	this.status = "warmup";
	this.image = image;
	this.leveltimer = 0;
	this.draw = function(background, player, ui) {
		if (this.status == "warmup") {
			background.drawImage(this.levels[this.currentLevel % this.levels.length].background, 0, 0);
			var timestamp = new Date() - this.timer;  
			if (timestamp < 3000) {
				this.drawWarmup(ui, Math.abs(Math.floor(3 - timestamp / 1000)) + 1);
			} else {
				this.status = "running";
				this.timer = new Date();
				this.leveltimer = 0;
			}
		} else if (this.status == "running") {
			background.drawImage(this.levels[this.currentLevel % this.levels.length].background, 0, 0);
			this.drawPlayers(player, this.image);
			if (this.players[this.playerID].hasFinishedLevel) {
				if (this.leveltimer == 0) {
					this.leveltimer = new Date() - this.timer;
					this.drawResult(ui);
				} else {
					this.drawResult(ui);
				}
			} else {
				this.drawUI(ui);
			}
		} else if (this.status == "score") {
			this.drawResult(ui);
		}
	};
	this.drawResult = function(context) {
		context.fillStyle = "gray";
		context.fillRect(200,200,400,200);
		context.font="italic 20px Arial";
		context.fillStyle = "black";
		context.fillText("Level statistics", 250, 250);
		context.fillText("Score : " + this.players[this.playerID].score, 250, 300);
		context.fillText("Level timer: " + this.leveltimer / 1000 + "s", 250, 350);
	}
	this.drawWarmup = function(context, value) {
		context.font="italic 60px Arial";
		context.fillStyle = "red";
		context.fillText(value,370,270);
	};
	this.drawPlayers = function(context, image) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].isPlaying) {
				context.drawImage(image, this.players[i].x, this.players[i].y);
			}
		}
	};
	this.drawUI = function(context) {
		context.font="20px Arial";
		context.fillStyle = "gray";
		context.fillText((new Date() - this.timer) / 1000, 360, 25);
		context.fillText("Score: " + this.players[this.playerID].score,360,575);
	}
	this.movePlayer = function(vx, vy) {
		if ((this.status == "warmup" || this.status == "score") || this.players[this.playerID].hasFinishedLevel == true || this.players[this.playerID].isPlaying == false) {
			return false;
		}
		var hasMoved = false;
		if (!this.mapOverlap(this.players[this.playerID].x + vx, this.players[this.playerID].y + vy, this.players[this.playerID].w, this.players[this.playerID].h) 
				&& !this.obstaclesOverlap(this.players[this.playerID].x + vx, this.players[this.playerID].y + vy, this.players[this.playerID].w, this.players[this.playerID].h)) {
			this.players[this.playerID].x += vx;
			this.players[this.playerID].y += vy;
			hasMoved = true;	
		} 
		if (hasMoved && this.isInTarget(this.players[this.playerID].x, this.players[this.playerID].y, this.players[this.playerID].w, this.players[this.playerID].h)) {
			this.players[this.playerID].hasFinishedLevel = true;
		}
		return hasMoved;
	};
	this.obstaclesOverlap = function(x, y, w, h) {
		for (j = 0; j < this.levels[this.currentLevel % this.levels.length].obstacles.length; j++) {
			if (this.rectsOverlap(x, y, w, h, 
				this.levels[this.currentLevel % this.levels.length].obstacles[j].x, 
				this.levels[this.currentLevel % this.levels.length].obstacles[j].y, 
				this.levels[this.currentLevel % this.levels.length].obstacles[j].w, 
				this.levels[this.currentLevel % this.levels.length].obstacles[j].h)) {
				return true;
			}
		}
		return false;
	};
	this.isInTarget = function(x, y, w, h) {
		for (j = 0; j < this.levels[this.currentLevel % this.levels.length].targets.length; j++) {
			if (this.circRectsOverlap(x, y, w, h, 
				this.levels[this.currentLevel % this.levels.length].targets[j].x,
				this.levels[this.currentLevel % this.levels.length].targets[j].y, 
				this.levels[this.currentLevel % this.levels.length].targets[j].r)) 
				return true;
		}
		return false;
	};
	this.circRectsOverlap = function(x0, y0, w0, h0, cx, cy, r) {
        var testX=cx; 
        var testY=cy; 
          
        if (testX < (x0+w0)) testX=(x0+w0); 
        if (testX > x0) testX=x0; 
        if (testY < (y0+h0)) testY=(y0+h0); 
        if (testY > (y0)) testY=y0; 
 
        return (((cx-testX)*(cx-testX)+(cy-testY)*(cy-testY))<r*r); 
    };
    this.rectsOverlap = function(x0, y0, w0, h0, x2, y2, w2, h2) {
        return ((x0 + w0) > x2) && (x0 < (x2 + w2)) && ((y0 + h0) > y2) && (y0 < (y2 + h2));
    };
    this.mapOverlap = function(x, y, w, h) {
    	return (x + w > 800) || (x < 0) || (y + h > 600) || (y < 0);
    };
}