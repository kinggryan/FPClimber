#pragma strict

class GrapplingHookProjectile extends MonoBehaviour {
    public var tether: Tether;
    
    function FixedUpdate() {
        // Destroy self if not tethered. Otherwise, Move the attachment point.
        if(!tether.tethered)
            gameObject.Destroy(gameObject);
        else {
            tether.MoveFirstAttachmentPoint(transform.position);
            tether.ApplyTetherToHook(rigidbody);
        }
    }
}