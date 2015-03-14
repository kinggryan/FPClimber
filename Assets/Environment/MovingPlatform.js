#pragma strict

private var previousPosition:Vector3;
private var previousRotation:Quaternion;
private var stepMovement:Vector3;
private var stepRotation:Quaternion;

function Start() {
    previousPosition = transform.position;
    previousRotation = transform.rotation;
}

function Update() {
    stepMovement = transform.position - previousPosition;
    stepRotation = Quaternion.Inverse(previousRotation)*transform.rotation;
    
    previousPosition = transform.position;
    previousRotation = transform.rotation;
}

function MovePlayer(playerTransform:Transform) {
    playerTransform.position += stepMovement;
    playerTransform.rotation *= stepRotation;
}