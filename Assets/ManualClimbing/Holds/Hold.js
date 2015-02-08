#pragma strict

class Hold extends GenericHold {
	var balanceZone:Collider;
	
	function MoveContactPoint(currentPoint:Vector3,movementSpeed:float,rotation:Quaternion) : Vector3 {
		var movementVector = Vector3.zero;
		
		if(Input.GetKey("w")) {
			movementVector.y += 1;
		}
		if(Input.GetKey("s")) {
			movementVector.y -= 1;
		}
		if(Input.GetKey("a")) {
			movementVector.x -= 1;
		}
		if(Input.GetKey("d")) {
			movementVector.x += 1;
		}
		
		movementVector = rotation*movementVector;
		
		// move the contact point in space
		movementVector *= movementSpeed * Time.deltaTime;
		
		var tempPoint = currentPoint + movementVector;
		
		// find the closest point to this new point on the bounds of the collider
		return(collider.ClosestPointOnBounds(tempPoint));
		//return(MoveContactPoint(currentPoint,movementVector));
	}
	
	function MoveContactPoint(currentPoint:Vector3,movementVector:Vector3) : Vector3 {
	/*	var tempPoint = currentPoint + movementVector;
		return(collider.ClosestPointOnBounds(tempPoint)); */
		var movementRay = Ray(currentPoint,movementVector.normalized);
		var hitInfo: RaycastHit;
		if(collider.Raycast(movementRay,hitInfo,movementVector.magnitude)) {
			return(hitInfo.point);
		}
		else if(collider.Raycast(Ray(currentPoint,-movementVector.normalized),hitInfo,movementVector.magnitude)) {
			return(hitInfo.point);
		}
		else {
			return (currentPoint+movementVector);
		}
	}
	
	function MovePointWithinBalanceZone(point:Vector3) : Vector3 {
		// Cast a ray from point to origin. If we find a collision, then it is outside the center of balance zone, so move it to the edge, IE the point it hit
		var rayHitInfo:RaycastHit;
		
		if(balanceZone.Raycast(Ray(point,balanceZone.bounds.center - point),rayHitInfo,10)) {
			return (rayHitInfo.point);
		}
		
		// if there was no collision, the point is inside the zone, so just return the point
		return (point);
	}
	
	function IsPointWithinBalanceZone(point:Vector3) : boolean {
		var raycastHit:RaycastHit;
		if(balanceZone.Raycast(Ray(point,balanceZone.bounds.center - point),raycastHit,Vector3.Distance(point,balanceZone.bounds.center))) {
			return (false);
		}
		else {
			return (true);
		}
	}
	
	function GetHitPointOnBalanceZone(ray:Ray) : Vector3 {
		var raycastHit:RaycastHit;
		balanceZone.Raycast(ray,raycastHit,10);
		return raycastHit.point;
	}
	
	function HighlightBalanceZone(color:Color) {
		balanceZone.renderer.material.color = color;
	}
	
	function UnhighlightBalanceZone() {
		balanceZone.renderer.material.color = Color.gray;
	}
}