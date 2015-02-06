#pragma strict

class ConicalBalanceZoneHold extends GenericHold {
	var coneVertexOffset = Vector3.zero;
	var coneDirection = Vector3.down;
	var coneAngle = 45.0;
	
	function Start() {
		// see if there's a light. If so, set it's angle to the cone angle
		var light = GetComponentInChildren(Light) as Light;
		
		if(light != null && light.type == LightType.Spot) {
			light.spotAngle = coneAngle;
		}
	}
	
	function MovePointWithinBalanceZone(point:Vector3) : Vector3 {
		// TODO: fix this
		
		if(IsPointWithinBalanceZone(point)) {
			return(point);
		}
		else {
			// get the distance from the point to the vertex
			var distance = Vector3.Distance(point,transform.TransformPoint(coneVertexOffset));
			
			// get the angle from the direction to this point
			var angle = Vector3.Angle(point - transform.TransformPoint(coneVertexOffset),transform.TransformDirection(coneDirection));
			
			// get the difference between the angle and cone angle
			var angleDelta = angle - (0.5*coneAngle);
			
			// get the relative point we'll rotate towards
			var relativePointToRotateTowards = coneVertexOffset + (coneDirection * distance);
			var relativePoint = transform.InverseTransformPoint(point);
			
			// get relative rotated point
			var relativeRotatedPoint = Vector3.RotateTowards(relativePoint,relativePointToRotateTowards,angleDelta,Mathf.Infinity);
			
			// get that point in worldspace
			return(transform.TransformPoint(relativeRotatedPoint));
		}
	}
	
	function IsPointWithinBalanceZone(point:Vector3) : boolean {
		if(Vector3.Angle(point - transform.TransformPoint(coneVertexOffset),transform.TransformDirection(coneDirection)) <= (0.5*coneAngle))
			return true;
		else
			return false;
	}
	
	function GetHitPointOnBalanceZone(ray:Ray) : Vector3 {
		// TODO: write this method
		return ray.origin;
	}
}