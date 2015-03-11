#pragma strict

var climber:CharacterController;
var climberToRigidbodyMaxDistance = 0.1;

function OnJointBreak(breakForce:float) {
    // move player closer
    var distanceModifier = Vector3.Distance(climber.transform.position,transform.position) - climberToRigidbodyMaxDistance;
/*    if(distanceModifier > 0) {
        var movementDirection = (climberLockRigidbody.transform.position - climber.transform.position).normalized;
        climber.Move(movementDirection*distanceModifier);
        Debug.Log("pulling "+Time.time);
    } */
}