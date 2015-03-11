#pragma strict
import IList;

public class Tether extends MonoBehaviour {
	// Properties
	/*var tetherLength:float = 50;
    var tetherTotalLength: float = 0;
    var tetherGrapplingHookSegmentLength: float = 0;
    var tetherMaximumTotalLength: float = 30; */
    var tetherActualLength:float;
    var tetherDeployedLength: float;
    var tetherMaximumDeployedLength: float = 20;
    var tetherMinimumDeployedLength: float = 1.0;
    var playerToContactTargetDistance: float;
    var hookToContactTargetDistance: float;
    
	var characterController: CharacterController;
    var climberController : ClimberController;
    var toolDisplay:ToolDisplay;
	var swingDampenValue: float = 0.95;
	var maximumClipInDistance = 2.0;
	
	private var minimumTetherExtraPointDistance = 0.05;
	
	var attachmentPoints: ArrayList = ArrayList();
	
	var tethered:boolean = false;
	var ropeRenderer: LineRenderer;
	
	var previousPosition:Vector3;
	var ropeMaterial: Material;
    
    public var pointMarker:Transform;
    var hookDeployed: boolean = false;
	private var hookRigidbody: Rigidbody;
    var hookGrappled: boolean = false;
    
	// Methods
	function Start() {
		characterController = GetComponent(CharacterController);
        climberController = GetComponent(ClimberController);
        toolDisplay = climberController.toolDisplay;
	}
	
	function ApplyTether(velocity:Vector3) : Vector3 {
		if (!tethered) {
			return velocity;
		}
    
		// Check to see if we should create a new attachment point
		var finalPoint:Vector3 = attachmentPoints[attachmentPoints.Count - 1];
		var ray = Ray(transform.position, finalPoint - transform.position);
		var distance = Mathf.Max((finalPoint - transform.position).magnitude - minimumTetherExtraPointDistance,0);
		var newPointHitInfo: RaycastHit;
		if(Physics.Raycast(ray,newPointHitInfo,distance)) {
			attachmentPoints.Add(newPointHitInfo.point);
			// -= Vector3.Distance(newPointHitInfo.point,finalPoint); //= (newPointHitInfo.point - transform.position).magnitude;
        //    AdjustPlayerToContactTargetDistance();
            if(hookDeployed && attachmentPoints.Count == 2) {
                var hookPoint:Vector3 = attachmentPoints[0];
                hookToContactTargetDistance = Vector3.Distance(newPointHitInfo.point,hookPoint);
            }
		}
		
		// Check to see if we should remove the last attachmentpoint
		if(attachmentPoints.Count > 1) {
			var secondToLastPoint:Vector3 = attachmentPoints[attachmentPoints.Count - 2];
			var lastPoint:Vector3 = attachmentPoints[attachmentPoints.Count - 1];
        
            // Calculate unwrap check direction
            var hitFound = false;
            var ropeSegmentdir = (lastPoint - secondToLastPoint).normalized;
            var unwrappedSegmentDir = (transform.position - secondToLastPoint).normalized;
            var angle1 = Vector3.Angle(ropeSegmentdir,unwrappedSegmentDir);
            var rotationAngle = 90 - angle1;
            var rotationAxis = Vector3.Cross(ropeSegmentdir,unwrappedSegmentDir);
            var rotation = Quaternion.AngleAxis(-rotationAngle,rotationAxis);
            var unwrapCheckDirection = rotation * (-ropeSegmentdir);
            
            // Find unwrap check point by moving the last point in the unwrap direction.
            var unwrapCheckPoint = lastPoint + (unwrapCheckDirection * 0.05);
            pointMarker.position = unwrapCheckPoint;
            var unwrapThreshold = 0.025;
            
            // raycast. If there's a collision entering the unwrap checkpoint from either the player or the second to last point, do not unwrap.
            if( 
                (Physics.Raycast(secondToLastPoint,unwrapCheckPoint-secondToLastPoint,Vector3.Distance(unwrapCheckPoint,secondToLastPoint)) ||
                Physics.Raycast(transform.position,unwrapCheckPoint-transform.position,Vector3.Distance(unwrapCheckPoint,transform.position)) ||
                Physics.Raycast(unwrapCheckPoint,transform.position-unwrapCheckPoint,Vector3.Distance(unwrapCheckPoint,transform.position)))) {
                
                
                hitFound = true;
            }
			
			// see if we are on the same side of the previous side
			if(angle1 > unwrapThreshold && !hitFound) {
				// set length
				var newEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-2];
                var oldEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
				//playerToContactTargetDistance += Vector3.Distance(newEndPoint,oldEndPoint); //Vector3.Distance(transform.position,newEndPoint) + 0.05;
           //     AdjustPlayerToContactTargetDistance();
                attachmentPoints.RemoveAt(attachmentPoints.Count-1);
                if(hookDeployed && attachmentPoints.Count == 1) {
                    hookToContactTargetDistance = Vector3.Distance(newEndPoint,transform.position);
                }
			}
		} 
	
        AdjustTetherLength();
    
		// tether motion
		previousPosition = transform.position;
		var tetherPoint:Vector3 = (attachmentPoints[attachmentPoints.Count - 1]);
		var startPosition = transform.position;
		distance = (transform.position - tetherPoint).magnitude;
		var tetherDirection = tetherPoint - transform.position;
		
		// Set rope renderer points
		ropeRenderer.SetVertexCount(attachmentPoints.Count+1);
		var index = 0;
		for(p in attachmentPoints) {
			var point:Vector3 = p;
			ropeRenderer.SetPosition(index,point);
			index++;
		}
		ropeRenderer.SetPosition(attachmentPoints.Count,transform.TransformPoint(Vector3(0,-0.5,0)));
		
		if (distance > playerToContactTargetDistance) {
			var endPosition = transform.position + tetherDirection.normalized * (distance-playerToContactTargetDistance);
			var preMovePos = transform.position;
			characterController.Move(tetherDirection.normalized * (distance-playerToContactTargetDistance));
			var postMovePos = transform.position;
			
			return (velocity + (postMovePos - preMovePos)*swingDampenValue/Time.deltaTime);
		}
		else {
			return velocity;
		}
	}
	
	function Update() {
		if(climberController.tool == ClimberTool.Rope && !tethered && Input.GetMouseButtonDown(0)) {
			var hitInfo: RaycastHit;
			var attachedCamera = GetComponentInChildren(Camera) as Camera;
			if(	Physics.Raycast(transform.position,attachedCamera.transform.forward,hitInfo) && 
				hitInfo.distance <= maximumClipInDistance &&
				hitInfo.collider.GetComponent(RockInfo) != null &&
				(hitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClipable(hitInfo.textureCoord)) {
				attachmentPoints.Add(hitInfo.point);
				tethered = true;
                tetherDeployedLength = (transform.position - hitInfo.point).magnitude + 1;
				playerToContactTargetDistance = tetherMaximumDeployedLength + 1.0;  //(transform.position - hitInfo.point).magnitude + 1;
								
				ropeRenderer = gameObject.AddComponent(LineRenderer) as LineRenderer;
				ropeRenderer.material = ropeMaterial;
				ropeRenderer.SetWidth(0.03,0.03);
				ropeRenderer.SetColors(Color.yellow,Color.yellow);
				ropeRenderer.SetVertexCount(2);
				ropeRenderer.SetPosition(0,transform.TransformPoint(Vector3(0,-0.5,0)));
				ropeRenderer.SetPosition(1,hitInfo.point);
				
				previousPosition = transform.position;
                
                // tell tool display
                toolDisplay.Activate();
			}
		}	
		
		if(tethered) {
			if((climberController.tool == ClimberTool.Rope || climberController.tool == ClimberTool.Hook) && Input.GetMouseButtonDown(1)) {
				tethered = false;
				attachmentPoints.Clear();
				gameObject.Destroy(ropeRenderer);
                toolDisplay.Deactivate();
                hookDeployed = false;
                hookRigidbody = null;
			}
		}
	}
	
	function GetRopeTensionDirection() : Vector3 {
		// Return direction from transform to pull point
		var tetherPoint:Vector3 = (attachmentPoints[attachmentPoints.Count - 1]);
		return ((tetherPoint - transform.position).normalized);
	}
    
    function GetTensionPoint() : Vector3 {
        return(attachmentPoints[attachmentPoints.Count-1]);
    }
    
    function MoveFirstAttachmentPoint(targetPosition : Vector3) {
		// Check to see if we should create a new attachment point
   /*     if(attachmentPoints.Count == 1) {
            //playerToContactTargetDistance += Vector3.Distance(targetPosition,attachmentPoints[0]);
            tetherDeployedLength += Vector3.Distance(targetPosition,attachmentPoints[0]);
            hookToContactTargetDistance += Vector3.Distance(targetPosition,attachmentPoints[0]);
        } */
        attachmentPoints[0] = targetPosition;
		var firstPoint:Vector3 = targetPosition;
		var ray:Ray;
        var secondToFirstPoint:Vector3;
        var distance:float;
        
        // We only want to add or remove points from here if there are more than two points. This is because the adding and removing points will be covered by the standard wrapping code if we have 2 or 1 point.
        if(attachmentPoints.Count > 1) {
            secondToFirstPoint = attachmentPoints[1];
            ray = Ray(firstPoint,secondToFirstPoint - firstPoint);
            distance = Mathf.Max(Vector3.Distance(secondToFirstPoint,firstPoint) - minimumTetherExtraPointDistance,0);
		
		    var newPointHitInfo: RaycastHit;
		    if(Physics.Raycast(ray,newPointHitInfo,distance) && Vector3.Distance(newPointHitInfo.point,secondToFirstPoint) > minimumTetherExtraPointDistance && Vector3.Distance(newPointHitInfo.point,firstPoint) > minimumTetherExtraPointDistance) {
			    attachmentPoints.Insert(1,newPointHitInfo.point);
                secondToFirstPoint = newPointHitInfo.point;
            //    if(attachmentPoints.Count == 2)
			     //   playerToContactTargetDistance = (newPointHitInfo.point - transform.position).magnitude;
                hookToContactTargetDistance = Vector3.Distance(newPointHitInfo.point,firstPoint); //-= Vector3.Distance(newPointHitInfo.point,secondToFirstPoint) - 0.1;
                Debug.Log("setting hook distance : " +hookToContactTargetDistance);
		    }
		
            // TODO: this is in progress
		    // Check to see if we should remove the last attachmentpoint
		    if(attachmentPoints.Count > 2) {
                secondToFirstPoint = attachmentPoints[1];
                var thirdPoint:Vector3 = attachmentPoints[2];   
                
                // Calculate unwrap check direction
                var hitFound = false;
                var ropeSegmentdir = (secondToFirstPoint - thirdPoint).normalized;
                var unwrappedSegmentDir = (firstPoint - thirdPoint).normalized;
                var angle1 = Vector3.Angle(ropeSegmentdir,unwrappedSegmentDir);
                var rotationAngle = 90 - angle1;
                var rotationAxis = Vector3.Cross(ropeSegmentdir,unwrappedSegmentDir); // TODO : Make directionality not matter. Wrapping clockwise works, unclockwise does not
                var rotation = Quaternion.AngleAxis(-rotationAngle,rotationAxis);
                var unwrapCheckDirection = rotation * (-ropeSegmentdir);
            
                // Find unwrap check point by moving the last point in the unwrap direction.
                var unwrapCheckPoint = secondToFirstPoint + (unwrapCheckDirection * 0.05);
                var unwrapThreshold = 0.025;
            
                // raycast. If there's a collision entering the unwrap checkpoint from either the player or the second to last point, do not unwrap.
                if( Physics.Raycast(thirdPoint,unwrapCheckPoint-thirdPoint,Vector3.Distance(unwrapCheckPoint,thirdPoint)) ||
                    Physics.Raycast(firstPoint,unwrapCheckPoint-firstPoint,Vector3.Distance(unwrapCheckPoint,firstPoint)) ||
                    Physics.Raycast(unwrapCheckPoint,firstPoint-unwrapCheckPoint,Vector3.Distance(unwrapCheckPoint,firstPoint))) {
                
                    hitFound = true;
                }
			
			    // see if we are on the same side of the previous side
			    if(angle1 > unwrapThreshold && !hitFound) {
				    // set length
                    hookToContactTargetDistance = Vector3.Distance(firstPoint,thirdPoint) + 0.1;//+= Vector3.Distance(secondToFirstPoint,thirdPoint);
                    attachmentPoints.RemoveAt(1);
                
                    if(attachmentPoints.Count == 1) {
				        var newEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
                
				    //    playerToContactTargetDistance = (transform.position - newEndPoint).magnitude + 0.1;
                    }
			    } 
		    } 
        }
        
        // Adjust tether length
      //  AdjustTetherLength();
        
		// Set rope renderer points
		ropeRenderer.SetVertexCount(attachmentPoints.Count+1);
		var index = 0;
		for(p in attachmentPoints) {
			var point:Vector3 = p;
			ropeRenderer.SetPosition(index,point);
			index++;
		}
		ropeRenderer.SetPosition(attachmentPoints.Count,transform.TransformPoint(Vector3(0,-0.5,0))); 
    } 
    
    function AttachToHook(grapplingHook: GrapplingHookProjectile) {
		attachmentPoints.Add(grapplingHook.transform.position);
        Debug.Log("throwing");
		tethered = true;
		//playerToContactTargetDistance = (transform.position - grapplingHook.transform.position).magnitude + 1;
		//tetherDeployedLength = (transform.position - grapplingHook.transform.position).magnitude + 1;
        tetherDeployedLength = tetherMaximumDeployedLength;
        hookToContactTargetDistance = tetherDeployedLength;
        playerToContactTargetDistance = tetherMaximumDeployedLength;
        
        var springJoint = grapplingHook.gameObject.GetComponent(SpringJoint) as SpringJoint;
        springJoint.maxDistance = hookToContactTargetDistance;
        springJoint.connectedAnchor = transform.position;
        				
		ropeRenderer = gameObject.AddComponent(LineRenderer) as LineRenderer;
		ropeRenderer.material = ropeMaterial;
		ropeRenderer.SetWidth(0.03,0.03);
		ropeRenderer.SetColors(Color.yellow,Color.yellow);
		ropeRenderer.SetVertexCount(2);
		ropeRenderer.SetPosition(0,transform.TransformPoint(Vector3(0,-0.5,0)));
		ropeRenderer.SetPosition(1,grapplingHook.transform.position);
		
		previousPosition = transform.position;
        hookDeployed = true;
        hookRigidbody = grapplingHook.rigidbody;
        hookGrappled = false;
        
        // tell tool display
        toolDisplay.Activate();
    }

    function AdjustTetherLength() {
        // Adjust total deployed length here
		if(Input.GetKey("q") && tetherDeployedLength < tetherMaximumDeployedLength)
	        tetherDeployedLength += 1 * Time.fixedDeltaTime;
		else if(Input.GetKey("e") && tetherDeployedLength > tetherMinimumDeployedLength)
		    tetherDeployedLength -= 1 * Time.fixedDeltaTime;
        
        // calculate total actual length here
        tetherActualLength = 0;
        var firstPoint:Vector3 = attachmentPoints[0];
        var secondPoint:Vector3;
        
   /*     for(var i = 0 ; i < attachmentPoints.Count - 1 ; i++) {
            secondPoint = attachmentPoints[i+1];
            tetherActualLength += Vector3.Distance(secondPoint,firstPoint);
            firstPoint = secondPoint;
        }    
        firstPoint = attachmentPoints[attachmentPoints.Count-1];
        tetherActualLength += Vector3.Distance(firstPoint,transform.position); */
        
        // if we are not hooked, calculate as normal
        if(!hookDeployed || hookGrappled) {
            for(var i = 0 ; i < attachmentPoints.Count - 1 ; i++) {
                secondPoint = attachmentPoints[i+1];
                tetherActualLength += Vector3.Distance(secondPoint,firstPoint);
                firstPoint = secondPoint;
            }    
            firstPoint = attachmentPoints[attachmentPoints.Count-1];
            tetherActualLength += Vector3.Distance(firstPoint,transform.position);
        }
        // if hook is deployed, the first distance should be the hook target length
        else {
            tetherActualLength += hookToContactTargetDistance;
            for(var j = 1 ; j < attachmentPoints.Count - 1 ; j++) {
                firstPoint = attachmentPoints[j];
                secondPoint = attachmentPoints[j+1];
                tetherActualLength += Vector3.Distance(secondPoint,firstPoint);
            } 
            if(attachmentPoints.Count > 1) {
                firstPoint = attachmentPoints[attachmentPoints.Count-1];
                tetherActualLength += Vector3.Distance(firstPoint,transform.position);
            }
        }  
        
        // calculate player to contact actual length
        var playerToContactActualDistance = Vector3.Distance(transform.position,firstPoint);
        
        // get spring joint
        var springJoint:SpringJoint;
        if(hookRigidbody != null) {
            springJoint = hookRigidbody.GetComponent(SpringJoint) as SpringJoint;
        }
        
        var lengthModifier = tetherDeployedLength - tetherActualLength;
        if(lengthModifier < 0) {
            if(hookDeployed && !hookGrappled) {
                if(lengthModifier < 0) {
                    var p1:Vector3 = attachmentPoints[0];
                    var p2:Vector3;
                    if(attachmentPoints.Count == 1)
                        p2 = transform.position;
                    else
                        p2 = attachmentPoints[1];
                    var hookToContactDistance = Vector3.Distance(p1,p2);
                
                    // if we can pull the grappling hook closer, pull on it
                    if(hookToContactTargetDistance + lengthModifier > 0.5) {
                        springJoint.connectedAnchor = p2;
                        hookToContactTargetDistance += lengthModifier;
                        springJoint.maxDistance = hookToContactTargetDistance; //hookToContactDistance + lengthModifier;
                        Debug.Log("E: " + hookToContactTargetDistance);
                    }
                    // if we can't pull the hook closer, tighten the player distance
                    else {
                        Debug.Log("B: "+ lengthModifier);
                        playerToContactTargetDistance = Mathf.Max(0,playerToContactActualDistance+lengthModifier);
                    }
                }
                else {
                    var p3:Vector3;
                    if(attachmentPoints.Count == 1)
                        p3 = transform.position;
                    else
                        p3 = attachmentPoints[1];
                    hookToContactTargetDistance += lengthModifier;
                    springJoint.connectedAnchor = p3;
                    springJoint.maxDistance = hookToContactTargetDistance;
                }
            }
            // else if we're not hooked in, shorten player -> contact distance
            else {
                Debug.Log("C: "+playerToContactTargetDistance);
                playerToContactTargetDistance = Mathf.Max(0,playerToContactActualDistance+lengthModifier);
            }
        }
        // else if we aren't pulling on the rope, allow the hook to dangle
        else {
            playerToContactTargetDistance = playerToContactActualDistance+lengthModifier;
            if(hookDeployed && !hookGrappled) {
                var p4:Vector3;
                if(attachmentPoints.Count == 1)
                    p4 = transform.position;
                else
                    p4 = attachmentPoints[1];
                hookToContactTargetDistance += lengthModifier;
                springJoint.connectedAnchor = p4;
                springJoint.maxDistance = hookToContactTargetDistance;
            }
        }
    }
    
    function LengthenTether(tetherLengthChange:float) {
        tetherDeployedLength = Mathf.Min(tetherLengthChange+tetherDeployedLength,tetherMaximumDeployedLength);
    }
    
    function GrappleHookedOn() {
        var p1:Vector3 = attachmentPoints[0];
        var p2:Vector3;
        if(attachmentPoints.Count == 1)
            p2 = transform.position;
        else
            p2 = attachmentPoints[1];
        hookToContactTargetDistance = Vector3.Distance(p1,p2);
        hookGrappled = true;
    }
    
    function LengthenTetherFromMovement(startPosition:Vector3,movement:Vector3) {
        // Find the end position
        var endPosition = movement+startPosition;
        var attachedPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
        var lengthModifier = Vector3.Distance(attachedPoint,endPosition) - Vector3.Distance(attachedPoint,startPosition);
        
        // if this would lengthen the hope, attempt to lengthen it
        if(lengthModifier > 0 && tetherDeployedLength < tetherMaximumDeployedLength) {
            tetherDeployedLength += lengthModifier;
        }
        else if(lengthModifier < 0 && tetherDeployedLength > tetherMinimumDeployedLength) {
            tetherDeployedLength += lengthModifier;
        }
    }
}