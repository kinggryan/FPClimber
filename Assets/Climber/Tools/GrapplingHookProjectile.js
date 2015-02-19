#pragma strict

class GrapplingHookProjectile extends MonoBehaviour {
    public var tether: Tether;
    
    function FixedUpdate() {
        tether.MoveFirstAttachmentPoint(transform.position);
    }
}