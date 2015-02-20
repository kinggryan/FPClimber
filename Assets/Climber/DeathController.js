#pragma strict

class DeathController extends MonoBehaviour {
    // Properties
    var currentRespawnPoint: Vector3;
    var respawnFacingDirection: Vector3;
    var climber: ClimberController;
    var deathEffect: DeathEffect;
    
    // Methods
    function Start() {
        currentRespawnPoint = climber.transform.position;
        respawnFacingDirection = climber.transform.forward;
    }
    
    function RespawnStart() {
        // Set climber stuff
        climber.transform.position = currentRespawnPoint;
        climber.transform.rotation = Quaternion.LookRotation(respawnFacingDirection,Vector3.up);
        climber.maximumEnergy = climber.startingMaximumEnergy;
        climber.enabled = true;
        climber.energy = climber.maximumEnergy;
        climber.RespawnStart();
        
        // Fade scene in
        deathEffect.StartFadeIn();
    }
    
    function RespawnComplete() {
        // Called once fade in is complete
        climber.RespawnComplete();
    }
}