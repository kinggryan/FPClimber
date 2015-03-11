#pragma strict

class GrapplingHookProjectile extends MonoBehaviour {
    public var tether: Tether;
    private var grappled = false;
    
    function FixedUpdate() {
        // Destroy self if not tethered. Otherwise, Move the attachment point.
        if(!tether.tethered)
            gameObject.Destroy(gameObject);
        else {
            tether.MoveFirstAttachmentPoint(transform.position);
         //   tether.ApplyTetherToHook(rigidbody);
        }
    }
    
    function OnCollisionEnter(collision:Collision) {
        // See if we hit a grappleable object
        var grappleObject = collision.collider.gameObject.GetComponent(GrappleableObject) as GrappleableObject;
        if(!grappled && grappleObject != null) {
            var fixedJoint = gameObject.AddComponent(FixedJoint) as FixedJoint;
            var averageContactPoint = Vector3.zero;
            var count = 0;
            for(p in collision.contacts) {
                averageContactPoint += p.point;
                count++;
            }
            averageContactPoint /= count;
            
            fixedJoint.connectedAnchor = grappleObject.GetGrapplePoint(averageContactPoint);
            tether.GrappleHookedOn();
        }
    }
}