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

function ScoreData(username, score) {
	this.username = username;
	this.score = score;
}

function Player(username, x, y, w, h, c) {
	this.username = username;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.hasFinishedLevel = false;
	this.isPlaying = true;
	this.score = 0;
	this.draw = function(context) {
		context.fillStyle = this.c;
		context.fillRect(this.x, this.y, this.w, this.h);
	};
}

function Target(x, y, r, c) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.c = c;
	this.draw = function(context) {
		context.save();
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2*Math.PI, false);
        context.fillStyle= this.c;
        context.fill();
        context.restore();
	};
}

function Obstacle(x, y, w, h, c) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.c = c;
	this.draw = function(context) {
		context.fillStyle = this.c;
		context.fillRect(this.x, this.y, this.w, this.h);
	};
}

function Level(obstacles, targets, background) {
	this.obstacles = obstacles;
	this.targets = targets;
	this.background = background;
}

