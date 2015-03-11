#pragma strict

class CloudSpiritGround extends MonoBehaviour {
    // Properties
    var climber:Transform;
    var climberCamera:Transform;
    private var offset:Vector3 = Vector3(0,-0.5,0);
    
    function Update() {
        transform.rotation = climberCamera.rotation;
        transform.position = climber.position;
        transform.position = transform.TransformPoint(offset);
    }
}