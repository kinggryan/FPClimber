#pragma strict

class ClimberGUI extends MonoBehaviour {
	// Climber Look Properties
	var climbSightFlashTime = 1.5;
	var climbSightFlashColor = Color.gray;
	var climbTintValue = 0.0;
	var climbTintUp: boolean = true;
	var reticle: GUITexture;
	var dynoReticle: GUITexture = GUITexture();
	private var flashing: boolean = false;
	private var flashAmount: float = 1.0;
	private var flashFrequency: float = 1.25;
	private var flashIncreasing: boolean = false;
    
    private var climberController: ClimberController;
    private var climberCamera: Camera;
    
    function Start() {
        climberController = GetComponent(ClimberController) as ClimberController;
        climberCamera = GetComponentInChildren(Camera) as Camera;
        
    }
    
	function OnGUI() {
		// Draw Reticle
		var reticleRaycastInfo: RaycastHit;
		// If we're looking at a rock that is within grab range, flash the reticle
		if(Physics.Raycast(transform.position,climberCamera.transform.forward,reticleRaycastInfo)) {
			if( reticleRaycastInfo.collider.GetComponent(RockInfo) != null &&
				(reticleRaycastInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(reticleRaycastInfo.textureCoord) && 
				reticleRaycastInfo.distance <= climberController.climbingHoldCheckDistance) {
				
				// Set starting flash properties
				if(!flashing) {
					flashing = true;
					flashAmount = 1.0;
					flashIncreasing = false;
				}
				
				// Modify Flash amount
				if(flashIncreasing) {
					flashAmount += 0.5*flashFrequency*Time.deltaTime;
					if (flashAmount > 1) {
						flashAmount = 1;
						flashIncreasing = false;
					}
				}
				else {
					flashAmount -= 0.5*flashFrequency*Time.deltaTime;
					if (flashAmount < 0) {
						flashAmount = 0;
						flashIncreasing = true;
					}
				}
				
				// Change color of reticle
				reticle.color = Color.gray*(1-flashAmount) + Color.blue*flashAmount;
			}
			else {
				flashing = false;
				reticle.color = Color.gray;
			}
		}
		else {
			flashing = false;
			reticle.color = Color.gray;
		}
		
		// Draw Dyno Fullness
		if(climberController.currentDynoCharge >= 0) {
			reticle.color = Color.gray*(1-(climberController.currentDynoCharge/100)) + Color.yellow*(climberController.currentDynoCharge/100);
		} 
			
		// Draw Energy Bar
		var barFullness = Screen.width * climberController.energy / climberController.startingMaximumEnergy;
		GUI.color = Color.green;
		GUI.Button(Rect(0,0,barFullness,15),"");
		
		// Draw unfilled energy bar
		var barEmpty = Screen.width * (climberController.maximumEnergy - climberController.energy) / climberController.startingMaximumEnergy;
		GUI.color = Color.black;
		GUI.Button(Rect(barFullness,0,barFullness + barEmpty,15),"");
		
		// Draw damaged energy bar
		GUI.color = Color.red;
		GUI.Button(Rect(barFullness + barEmpty,0,Screen.width - (barFullness + barEmpty),15),"");
		GUI.color = Color.black;
	}	
}