#pragma strict
import IList;

public class Tether extends MonoBehaviour {
	// Properties
	var tetherLength:float = 50;
	var characterController: CharacterController;
	var swingDampenValue: float = 0.95;
	var minimumTetherLength = 1.0;
	var maximumClipInDistance = 2.0;
	
	private var minimumTetherExtraPointDistance = 0.05;
	
	var attachmentPoints: ArrayList = ArrayList();
	
	var tethered:boolean = false;
	var ropeRenderer: LineRenderer;
	
	var previousPosition:Vector3;
	var attachmentPointPlanes:ArrayList = ArrayList();
	var planeSides:ArrayList = ArrayList();
	var ropeMaterial: Material;
	
	// Methods
	function Start() {
		characterController = GetComponent(CharacterController);
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
			
			// add new plane 
			var normal = (transform.position - previousPosition).normalized;
			var plane = Plane(normal,transform.position);
			Debug.Log("new plane normal : "+normal);
						
			attachmentPointPlanes.Add(plane);
			planeSides.Add(plane.GetSide(previousPosition));
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
					Debug.Log("last: " + lastPoint + " second to last: " +secondToLastPoint + " target: " +targetPoint);
					Debug.Log("Hit object: "+raycastHitInfo.collider+" and position "+raycastHitInfo.point);
					Debug.Log("The same? "+(raycastHitInfo.point == targetPoint));
					hitFound = true;
					break;
				}
				lerpAmount += lerpStepIncrement;
			}
			
			// see if we are on the same side of the previous side
			if(!hitFound) {//checkPlane.GetSide(transform.position) == previousSide) {
				// then remove the point
				Debug.Log("Removing: " +attachmentPoints[attachmentPoints.Count - 1]);
				attachmentPoints.RemoveAt(attachmentPoints.Count - 1);
				attachmentPointPlanes.RemoveAt(attachmentPointPlanes.Count-1);
				planeSides.RemoveAt(planeSides.Count-1);
				
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
			characterController.Move(tetherDirection.normalized * (distance-tetherLength));
			
			return ((velocity + (tetherDirection.normalized * swingDampenValue * (distance-tetherLength))/Time.deltaTime));
		}
		else {
			return velocity;
		}
	}
	
	function Update() {
		if(!tethered && Input.GetKeyDown("q")) {
			var hitInfo: RaycastHit;
			var attachedCamera = GetComponentInChildren(Camera) as Camera;
			if(	Physics.Raycast(transform.position,attachedCamera.transform.forward,hitInfo) && 
				hitInfo.distance <= maximumClipInDistance &&
				hitInfo.collider.GetComponent(RockInfo) != null &&
				(hitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClipable(hitInfo.textureCoord)) {
				Debug.Log("HIT point: "+hitInfo.point);
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
			}
			else {
				Debug.Log("miss");
			}
		}	
		
		if(tethered) {
			if(Input.GetKeyDown("z")) {
				tethered = false;
				attachmentPoints.Clear();
				attachmentPointPlanes.Clear();
				planeSides.Clear();
				gameObject.Destroy(ropeRenderer);
			}
		}
	}
	
	function GetRopeTensionDirection() : Vector3 {
		// Return direction from transform to pull point
		var tetherPoint:Vector3 = (attachmentPoints[attachmentPoints.Count - 1]);
		return ((tetherPoint - transform.position).normalized);
	}
}