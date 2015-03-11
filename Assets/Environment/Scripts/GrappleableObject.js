#pragma strict

class GrappleableObject extends MonoBehaviour {
    // Properties
    
    // Methods
    function GetGrapplePoint(contactPoint:Vector3) {
        return(contactPoint);
    }
}