#pragma strict

class SmoothClimber extends MonoBehaviour {
    private var targetRotation: Quaternion;
    private var climbingNormal: Vector3;
    private var climbingHoldActualDistance = 1.2;
    private var climbingHoldCheckDistance = 1.3;
    
    private var controller:CharacterController;
    
    private var currentlyLerping = false;
    private var lerpTarget : Vector3;
    private var pivotPoint: Vector3;
    
    function Start() {
        targetRotation = transform.rotation;
        controller = GetComponent(CharacterController) as CharacterController;
        climbingNormal = -1*transform.forward;
    }
    
    function Update() {
        var velocityChange = Vector3.zero;
		var inputMovement = Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("3rdMovement"), Input.GetAxis("Vertical"));
        velocityChange = Climb(inputMovement,velocityChange);
        
        controller.Move(velocityChange*Time.deltaTime);
    }
    
    function Climb(inputMovement:Vector3,velocityChange:Vector3) : Vector3 {
        if(currentlyLerping)
            return(LerpClimbMovement());
        else
            return(StandardClimbMovement(inputMovement,velocityChange));
    }
    
    function LerpClimbMovement() : Vector3 {
        return Vector3.zero;
    }
    
    function StandardClimbMovement(inputMovement:Vector3,velocityChange:Vector3) : Vector3 {
        // Get expected climbing movement
		var expectedClimbMovement = Vector3(inputMovement.x,inputMovement.z,0) * 4;// * Time.deltaTime;
		expectedClimbMovement = transform.rotation*expectedClimbMovement;
        
        var climbInfo = GetClimbDirection(expectedClimbMovement);
	    if (climbInfo.climbDirection != Vector3.zero) {
			// Perform Movement
		    velocityChange += climbInfo.climbDirection;
		
		    // Adjust transform if the climbing Normal changed
		 /*   if(climbInfo.normal != climbingNormal) {
                Debug.Log("new normal : " +climbingNormal);
                
			    // Cross climbing Normal and the up vector
			    climbingNormal = climbInfo.normal;
			    var climbingUpCross = Vector3.Cross(climbingNormal,Vector3.up);
		
			    // Generate new local up by finding climbing Up Cross
			    var localUp = Vector3.Cross(climbingUpCross,climbingNormal);
		    
			    // Set new rotation and save camera transform rotation
			    targetRotation = Quaternion.LookRotation(-climbingNormal,localUp.normalized);
                
                // Determine if the you went over a convex angle. If so, adjust position.
                Debug.Log("Change in normal direction : "+Vector3.Angle(climbInfo.climbDirection,climbingNormal));
                if(Vector3.Angle(climbInfo.climbDirection,climbingNormal) < 90) {
                    Debug.Log("moving position");
					// Move self to be in the proper position
					transform.position = climbInfo.hitPoint + climbInfo.normal*climbingHoldActualDistance*0.9;
                }
		    } */
	    }
        else {
            Debug.Log("not moving");
        }
        
	    // Adjust transform if the climbing Normal changed
	    if(climbInfo.normal != climbingNormal) {
            Debug.Log("new normal : " +climbingNormal);
            
		    // Cross climbing Normal and the up vector
		    climbingNormal = climbInfo.normal;
		    var climbingUpCross = Vector3.Cross(climbingNormal,Vector3.up);
	
		    // Generate new local up by finding climbing Up Cross
		    var localUp = Vector3.Cross(climbingUpCross,climbingNormal);
	    
		    // Set new rotation and save camera transform rotation
		    targetRotation = Quaternion.LookRotation(-climbingNormal,localUp.normalized);
            
            // Determine if the you went over a convex angle. If so, adjust position.
            Debug.Log("Change in normal direction : "+Vector3.Angle(climbInfo.climbDirection.normalized,climbingNormal));
            if(Vector3.Angle(climbInfo.climbDirection,climbingNormal) < 90) {
                Debug.Log("moving position");
				// Move self to be in the proper position
				transform.position = climbInfo.hitPoint + climbInfo.normal*climbingHoldActualDistance*0.9;
            }
	    }
        else {
            Debug.Log("no normal change");
        }
        
		// adjust rotation
		transform.rotation = Quaternion.Lerp(transform.rotation,targetRotation,0.1);
		
		// And set yourself to be a valid distance away
		var holdDifference = climbingHoldActualDistance - climbInfo.distance;
		controller.Move(Mathf.Clamp(holdDifference,-.1,.1) * climbingNormal);
        
        return (velocityChange);
    }
    
    function GetClimbDirection(inputDirection: Vector3) : ClimbHitInfo {
		var climbInfo: ClimbHitInfo = ClimbHitInfo();
		var directionChangeAngle = 10.0;
		
		// first, check the standard ray
		var standardHitInfo: RaycastHit;
		var standardHit = Physics.Raycast(transform.position+(inputDirection*Time.deltaTime),-climbingNormal,standardHitInfo,climbingHoldCheckDistance);
			
		// if we found a climbable angle
		if ( standardHit ) {
			climbInfo.normal = standardHitInfo.normal;
			climbInfo.climbDirection = inputDirection;
			climbInfo.distance = standardHitInfo.distance;
            climbInfo.hitPoint = standardHitInfo.point;

			return (climbInfo);
		}
		
		// Next, check to see if we're climbing around a corner, but only if we failed to find any rock at all when climbing standard
		if(!standardHit) {
			directionChangeAngle = 140;
			while(directionChangeAngle >= 10) {
                
				var cornerRotation = Quaternion.AngleAxis(directionChangeAngle,Vector3.Cross(climbingNormal,inputDirection));
				var cornerHitInfo: RaycastHit;
				var pivotPoint = transform.position - (climbingNormal * climbingHoldCheckDistance); //+ (inputDirection*Time.deltaTime) - (1.1*climbingNormal*climbingHoldCheckDistance);
				var pivotModifier = cornerRotation*(transform.position - pivotPoint);
				var postPivotTransform = pivotPoint + pivotModifier;
				var cornerHit = Physics.Raycast(postPivotTransform,-(cornerRotation*climbingNormal),cornerHitInfo,climbingHoldCheckDistance);
			
				// if we found a climbable angle
				if ( cornerHit ) {
                    // set climbing information
					climbInfo.normal = cornerHitInfo.normal;
					climbInfo.climbDirection = postPivotTransform - transform.position;
					climbInfo.distance = cornerHitInfo.distance;
                    climbInfo.hitPoint = cornerHitInfo.point;
					
					// Move self to be in the proper position
			//		transform.position = cornerHitInfo.point + cornerHitInfo.normal*climbingHoldActualDistance;
            
                    Debug.Log("corner hit position : "+cornerHitInfo.point);
                    Debug.Log("corner hit normal : " + cornerHitInfo.normal);
                    
					return (climbInfo);
				}
				
				directionChangeAngle -= 10;
			}
		} // end corner check
        
        Debug.LogError("failure");
		// if we failed, return a zero vector
		climbInfo.climbDirection = Vector3.zero;
		climbInfo.normal = climbingNormal;
		climbInfo.distance = climbingHoldActualDistance;
		return( climbInfo);
    }
}