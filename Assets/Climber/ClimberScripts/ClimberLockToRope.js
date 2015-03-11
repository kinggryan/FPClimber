#pragma strict

class ClimberLockToRope extends MonoBehaviour {
    // Properties
    var climber: CharacterController;
    var climberLockRigidbody: Rigidbody;
    var currentlyOn:boolean = true;
    private var lockToClimberSpringDistance: float = 0.2;
    private var climberToRigidbodyMaxDistance: float = 0.05;
    
    // Methods
    function Start() {
        for(var col in climber.GetComponents(Collider)) {
            Physics.IgnoreCollision(col,climberLockRigidbody.collider);
        }
    }
    
    function PullClimberToRigidbody() {
        var distanceModifier = Vector3.Distance(climber.transform.position,climberLockRigidbody.transform.position) - climberToRigidbodyMaxDistance;
        if(distanceModifier > 0) {
            var movementDirection = (climberLockRigidbody.transform.position - climber.transform.position).normalized;
            climber.Move(movementDirection*distanceModifier);
            Debug.Log("pulling "+Time.time);
        }
    }
    
    function FixedUpdate() {
    //    var springJoint = climberLockRigidbody.GetComponent(SpringJoint) as SpringJoint;
    //    springJoint.connectedAnchor = climber.transform.position;
//        Debug.Log("Connected Anchor: " +springJoint.connectedAnchor);
    }
}