#pragma strict

function OnCollisionEnter(collision: Collision) {
    Debug.Log("dead?");
    
    
}

function OnTriggerEnter(collider: Collider) {
    // If this is the climber, kill them!!
    var player = collider.GetComponent(ClimberController) as ClimberController;
    
    if(player != null) {
        player.Die();
    }
}