#pragma strict

class RespawnPoint extends MonoBehaviour {
    // Properties
    var deathController: DeathController;
    var lookDirection: Vector3;
    
    function OnTriggerEnter() {
        deathController.currentRespawnPoint = transform.position;
        deathController.respawnFacingDirection = lookDirection;
    }
}