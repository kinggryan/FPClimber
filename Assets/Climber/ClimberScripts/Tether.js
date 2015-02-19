#pragma strict
import IList;

public class Tether extends MonoBehaviour {
	// Properties
	var tetherLength:float = 50;
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
		var distance = (finalPoint - transform.position).magnitude - minimumTetherExtraPointDistance;
		var newPointHitInfo: RaycastHit;
		if(Physics.Raycast(ray,newPointHitInfo,distance)) {
			Debug.Log("Adding : "+ newPointHitInfo.point + "length : "+tetherLength);
			attachmentPoints.Add(newPointHitInfo.point);
			tetherLength = (newPointHitInfo.point - transform.position).magnitude;
		}
		
		// Check to see if we should remove the last attachmentpoint
		if(attachmentPoints.Count > 1) {
			var secondToLastPoint:Vector3 = attachmentPoints[attachmentPoints.Count - 2];
			var lastPoint = attachmentPoints[attachmentPoints.Count - 1];
			var lerpStepDistance = 0.5;
			var lerpStepIncrement = Mathf.Clamp(lerpStepDistance / Vector3.Distance(secondToLastPoint,lastPoint),0,1);
			var lerpAmount = 0.0;
			var hitFound = false;
			while(lerpAmount <= 1) {
				var targetPoint = Vector3.Lerp(lastPoint,secondToLastPoint,lerpAmount);
				targetPoint += 0.25 * (transform.position - targetPoint).normalized; //= Vector3.MoveTowards(targetPoint,transform.position,1.0);
				var raycastHitInfo:RaycastHit;
				if(Physics.Raycast(targetPoint,transform.position-targetPoint,raycastHitInfo)) {
					hitFound = true;
					break;
				}
				lerpAmount += lerpStepIncrement;
			}
			
			// see if we are on the same side of the previous side
			if(!hitFound) {
				// set length
				var newEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
				tetherLength = (transform.position - newEndPoint).magnitude;
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
			
			Debug.Log(tetherDirection.normalized * (distance-tetherLength));
			
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
			if(climberController.tool == ClimberTool.Rope && Input.GetMouseButtonDown(1)) {
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
		var firstPoint:Vector3 = targetPosition;
		var ray:Ray;
        var secondToFirstPoint:Vector3 = attachmentPoints[1];
        var distance:float;
        if(attachmentPoints.Count > 1) {
            ray = Ray(secondToFirstPoint,firstPoint - secondToFirstPoint);
            distance = Vector3.Distance(secondToFirstPoint,firstPoint);
        }
        else {
            ray = Ray(transform.position, firstPoint - transform.position);
            distance = Vector3.Distance(transform.position,firstPoint);
        }
        
		
		var newPointHitInfo: RaycastHit;
		if(Physics.Raycast(ray,newPointHitInfo,distance)) {
			attachmentPoints.Insert(1,newPointHitInfo.point);
            secondToFirstPoint = newPointHitInfo.point;
            if(attachmentPoints.Count == 2)
			    tetherLength = (newPointHitInfo.point - transform.position).magnitude;
		}
		
        // TODO: this is in progress
		// Check to see if we should remove the last attachmentpoint
		if(attachmentPoints.Count > 1) {
            secondToFirstPoint = attachmentPoints[1];
			var lerpStepDistance = 0.5;
			var lerpStepIncrement = Mathf.Clamp(lerpStepDistance / Vector3.Distance(secondToFirstPoint,firstPoint),0,1);
			var lerpAmount = 0.0;
			var hitFound = false;
            var thirdPoint:Vector3;
            if(attachmentPoints.Count == 2)
                thirdPoint = transform.position;
            else 
                thirdPoint = attachmentPoints[2];
            
			while(lerpAmount <= 1) {
				var targetPoint = Vector3.Lerp(firstPoint,secondToFirstPoint,lerpAmount);
				targetPoint -= 0.25 * (thirdPoint - targetPoint).normalized;
				var raycastHitInfo:RaycastHit;
                distance = Vector3.Distance(targetPoint,thirdPoint);
				if(Physics.Raycast(targetPoint,thirdPoint-targetPoint,raycastHitInfo,distance)) {
					hitFound = true;
					break;
				}
				lerpAmount += lerpStepIncrement;
			}
			
			// see if we are on the same side of the previous side
			if(!hitFound) {
				// set length
                attachmentPoints.RemoveAt(1);
				var newEndPoint:Vector3 = attachmentPoints[attachmentPoints.Count-1];
                
                if(attachmentPoints.Count == 1)
				    tetherLength = (transform.position - newEndPoint).magnitude;
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
}