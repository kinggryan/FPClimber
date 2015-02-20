﻿#pragma strict

class DeathEffect extends MonoBehaviour {
	// Properties
	public var fadeSpeed : float = 1.0f;            // Speed that the screen fades to and from black.

	private var sceneStarting : boolean = true;     // Whether or not the scene is still fading in.
	private var sceneEnding: boolean = false;
    
    public var deathController:DeathController;

	function Awake ()
	{
    	// Set the texture so that it is the the size of the screen and covers it.
    	guiTexture.pixelInset = new Rect(0f, 0f, Screen.width, Screen.height);
	}
	
	function Update ()
	{
    	// If the scene is starting...
    	if(sceneStarting)
       	// ... call the StartScene function.
        	StartScene();
		else if(sceneEnding)
			EndScene();
	}

	function FadeToClear ()
	{
    	// Lerp the colour of the texture between itself and transparent.
    	guiTexture.color = Color.Lerp(guiTexture.color, Color.clear, fadeSpeed * Time.deltaTime);
	}


	function FadeToBlack ()
	{
    	// Lerp the colour of the texture between itself and black.
    	guiTexture.color = Color.Lerp(guiTexture.color, Color.white, fadeSpeed * Time.deltaTime);
	}

	function StartScene ()
	{
    	// Fade the texture to clear.
    	FadeToClear();
    
    	// If the texture is almost clear...
   	 	if(guiTexture.color.a <= 0.05f)
    	{
        	// ... set the colour to clear and disable the GUITexture.
        	guiTexture.color = Color.clear;
        	guiTexture.enabled = false;
        
        	// The scene is no longer starting.
        	sceneStarting = false;
            
            // Tell Death Controller to enable damage on the player
            deathController.RespawnComplete();
    	}
	}

	public function EndScene ()
	{
		// set the end scene flag
		sceneEnding = true;
	
    	// Make sure the texture is enabled.
    	guiTexture.enabled = true;
    
    	// Start fading towards black.
   	 	FadeToBlack();
    
    	// If the screen is almost black...
    	if(guiTexture.color.a >= 0.95f) {
        	// ... reload the level.
        	//Application.LoadLevel(0);
            // Move the player to the reset position
            deathController.RespawnStart();
        }
	}
    
    function StartFadeIn() {
        sceneEnding = false;
        sceneStarting = true;
    }
}