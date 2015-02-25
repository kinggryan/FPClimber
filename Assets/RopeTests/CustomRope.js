#pragma strict

class CustomRope extends MonoBehaviour {
    // Properties
    public var ropeConnectionPoint: Transform;
    public var ropeLength: float = 7.5;
    public var jointsPerMeter = 1;
    public var jointPrefab: GameObject;
    
    private var joints: GameObject[];
    
    // Methods
    function Start() {
        // we want to create a joint at every point along the line towards the connection point.
        var currentPoint = transform.position;
        var previousJoint = rigidbody;
        Debug.Log("this many : "+((Vector3.Distance(ropeConnectionPoint.position,transform.position)*jointsPerMeter)-2));
        joints = new GameObject[(Vector3.Distance(ropeConnectionPoint.position,transform.position)*jointsPerMeter)-2];
        var jointIndex = 0;
        
        Debug.Log(Vector3.Distance(currentPoint,ropeConnectionPoint.position) );
        Debug.Log(1.0/jointsPerMeter);
        while(Vector3.Distance(currentPoint,ropeConnectionPoint.position) > 1.0/jointsPerMeter) {
            Debug.Log("making");
            currentPoint = Vector3.MoveTowards(currentPoint,ropeConnectionPoint.position,1.0/jointsPerMeter);
            
            // create a joint object
            var jointObject = GameObject.Instantiate(jointPrefab,currentPoint,Quaternion.identity);
            var cJoint = jointObject.GetComponent(Joint) as Joint;
            cJoint.connectedBody = previousJoint;
     //       springJoint.maxDistance = 1.0/jointsPerMeter;
            
            // set the previous joint property
            previousJoint = jointObject.rigidbody;
        }
        
        var fixedJoint = previousJoint.gameObject.AddComponent(FixedJoint) as FixedJoint;
        fixedJoint.connectedBody = ropeConnectionPoint.rigidbody;
    }
}