#pragma strict
import IList;

public class Tether extends MonoBehaviour {
	// Properties
	var tetherLength:float = 50;
    var tetherTotalLength: float = 0;
    var tetherGrapplingHookSegmentLength: float = 0;
    var tetherMaximumTotalLength: float = 30;
    
	var characterController: CharacterController;
    var climberController : ClimberController;
    var toolDisplay:ToolDisplay;
	var swingDampenValue: float = 0.95;
	var minimumTetherLength = 1.0;
	var maximumClipInDistance = 2.0;
	
	private var minimumTetherExtraPointDistance = 0.05;
	
	var attachmentPoints: ArrayList = ArrayList();
	
	var tethered:boolean = false;
	var ropeRenderer: LineRenderer;
	
	var previousPosition:Vector3;
	var ropeMaterial: Material;
    
    public var pointMarker:Transform;
	
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
		
		// adjust tether length
		if(Input.GetKey("q")) {
			tetherLength += 1 * Time.fixedDeltaTime;
		}
		if(Input.GetKey("e")) {
			if (tetherLength > minimumTetherLength) 
				tetherLength -= 1 * Time.fixedDeltaTime;
		}
	
		// Check to see if we should create a new attachment point
		var finalPoint:Vector3 = attachmentPoints[attachmentPoints.Count - 1];
		var ray = Ray(transform.position, finalPoint - transform.position);
		var distance = Mathf.Max((finalPoint - transform.position).magnitude - minimumTetherExtraPointDistance,0);
		var newPointHitInfo: RaycastHit;
		if(Physics.Raycast(ray,newPointHitInfo,distance)) {
			attachmentPoints.Add(newPointHitInfo.point);
			tetherLength = (newPointHitInfo.point - transform.position).magnitude;
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
            var rotationAxis = Vector3.Cross(ropeSegmentdir,unwrappedSegmentDir); // TODO : Make directionality not matter. Wrapping clockwise works, unclockwise does not
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
				tetherLength = Vector3.Distance(transform.position,newEndPoint) + 0.05;
                attachmentPoints.RemoveAt(attachmentPoints.Count-1);
			}
		} 
	
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
		
		if (distance > tetherLength) {
			var endPosition = transform.position + tetherDirection.normalized * (distance-tetherLength);
			var preMovePos = transform.position;
			characterController.Move(tetherDirection.normalized * (distance-tetherLength));
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
				tetherLength = (transform.position - hitInfo.point).magnitude + 1;
								
				ropeRenderer = gameObject.AddComponent(LineRenderer) as LineRenderer;
				ropeRenderer.material = ropeMaterial;
				ropeRenderer.SetWidth(0.1,0.1);
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
        if(attachmentPoints.Count == 1) {
            tetherLength += Vector3.Distance(targetPosition,attachmentPoints[0]);
        }
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
                if(attachmentPoints.Count == 2)
			        tetherLength = (newPointHitInfo.point - transform.position).magnitude;
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
                    attachmentPoints.RemoveAt(1);
                
                    if(attachmentPoints.Count == 1) {
				        var newEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
                
				        tetherLength = (transform.position - newEndPoint).magnitude + 0.1;
                    }
			    } 
		    } 
        }
        
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
		tetherLength = (transform.position - grapplingHook.transform.position).magnitude + 1;
						
		ropeRenderer = gameObject.AddComponent(LineRenderer) as LineRenderer;
		ropeRenderer.material = ropeMaterial;
		ropeRenderer.SetWidth(0.1,0.1);
		ropeRenderer.SetColors(Color.yellow,Color.yellow);
		ropeRenderer.SetVertexCount(2);
		ropeRenderer.SetPosition(0,transform.TransformPoint(Vector3(0,-0.5,0)));
		ropeRenderer.SetPosition(1,grapplingHook.transform.position);
		
		previousPosition = transform.position;
        
        // tell tool display
        toolDisplay.Activate();
    }
    
    function ApplyTetherToHook(grapplingHook: Rigidbody) {
        var springJoint = grapplingHook.GetComponent(SpringJoint) as SpringJoint;
        var remainingTetherLength = 0;
        var firstPoint:Vector3;
        if(attachmentPoints.Count > 1)
             firstPoint = attachmentPoints[1];
        else
            firstPoint = transform.position;
        var tetherAttachedToGrapplingHookSegmentLength = Vector3.Distance(grapplingHook.transform.position,firstPoint);
        
        for(var i = 1 ; i < attachmentPoints.Count - 1 ; i++) {
            var secondPoint:Vector3 = attachmentPoints[i+1];
            remainingTetherLength += Vector3.Distance(secondPoint,firstPoint);
            firstPoint = secondPoint;
        }
        remainingTetherLength += Vector3.Distance(firstPoint,transform.position);
        
        var lengthModifier = remainingTetherLength + tetherAttachedToGrapplingHookSegmentLength - tetherMaximumTotalLength;
        
        // set the spring length if we're tugging on the rope
        if(lengthModifier > 0) {
            springJoint.connectedAnchor = firstPoint;
            springJoint.maxDistance = Mathf.Max(tetherAttachedToGrapplingHookSegmentLength - lengthModifier,0);
        }
        else {
            springJoint.maxDistance = 1000;
            springJoint.connectedAnchor = grapplingHook.transform.position;
        }
    }
}