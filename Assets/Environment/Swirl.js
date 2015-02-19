#pragma strict

class Swirl extends MonoBehaviour {
    public var swirlSpeed = 0.2;
    public var rotationLocation: Vector3 = Vector3(5.0,0,0);
    
    function Update() {
        transform.RotateAround(transform.position + rotationLocation,Vector3.up,swirlSpeed*Time.deltaTime);
    }
}