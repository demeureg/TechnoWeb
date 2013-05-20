soundManager.url = 'soundmanager2.swf';
soundManager.debugMode = false;
//This function creates sounds in the load for sound effects when one finished a line
soundManager.onload = function()
{
	soundManager.createSound('oneLigne','./son/okay.wav');
	soundManager.createSound('twoLigne','./son/oh-yeah.wav');
	soundManager.createSound('threeLigne','./son/wow.wav');
	soundManager.createSound('fourLigne','./son/woohoo.wav');
	soundManager.createSound('fiveLigne','./son/unbelievable.wav');
}

//This function(office) throws(launches) a various sound according to the number of made line
function lancerSon(nombreLigneFaite)
{
	if(nombreLigneFaite == 1)
	{	
		soundManager.play('oneLigne');
	}
	if(nombreLigneFaite == 2)
	{	
		soundManager.play('twoLigne');
	}
	if(nombreLigneFaite == 3)
	{	
		soundManager.play('threeLigne');
	}
	if(nombreLigneFaite == 4)
	{
		soundManager.play('fourLigne');	
	}
	if(nombreLigneFaite >= 5)
	{
		soundManager.play('fiveLigne');	
	}
}

//This function stop the background music with the present button in playrooms
function stopMusique()
{
	var myAudio = document.getElementById("musiqueTetris");
	if (myAudio.paused) {
	    myAudio.play();
	    buttonStyle=document.getElementById("musique");
		buttonStyle.style.backgroundImage="url('./musiquePlay.png')";
	    
	} else {
	    myAudio.pause();
	    buttonStyle=document.getElementById("musique");
		buttonStyle.style.backgroundImage="url('./musiqueStop.png')";
	}
}

//This function stop the background music with the present button in chat
function stopMusiqueAccueil()
{
	var myAudio = document.getElementById("musiqueTetris");
	if (myAudio.paused) {
	    myAudio.play();
	    buttonStyle=document.getElementById("musiqueExplication");
		buttonStyle.style.backgroundImage="url('./musiquePlay.png')";
	    
	} else {
	    myAudio.pause();
	    buttonStyle=document.getElementById("musiqueExplication");
		buttonStyle.style.backgroundImage="url('./musiqueStop.png')";
	}
}