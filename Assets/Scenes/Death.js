#pragma strict

function OnGUI() {
	var deathRect = Rect(Screen.width/2-300,Screen.height/2-100,600,200);
	GUI.Label(deathRect,"YOU DIED!!!!");
}