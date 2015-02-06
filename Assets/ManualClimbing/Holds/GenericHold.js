#pragma strict

class GenericHold extends MonoBehaviour {
	function MoveContactPoint(currentPoint:Vector3,movementSpeed:float,rotation:Quaternion) : Vector3 { return currentPoint;}
	
	function MoveContactPoint(currentPoint:Vector3,movementVector:Vector3) : Vector3 { return currentPoint;}
	
	function MovePointWithinBalanceZone(point:Vector3) : Vector3 { Debug.Log("failing"); return point;}
	
	function IsPointWithinBalanceZone(point:Vector3) : boolean { Debug.Log("failing"); return false;}
	
	function GetHitPointOnBalanceZone(ray:Ray) : Vector3 { return ray.origin; }
	
	function OnTriggerEnter(collider: Collider) {
		// turn on light 
		var light = GetComponentInChildren(Light) as Light;
		if(light != null)
			light.enabled = true;
	}
	
	function OnTriggerExit(collider: Collider) {
		// turn on light 
		var light = GetComponentInChildren(Light) as Light;
		if(light != null)
			light.enabled = false;
	}
	
	function HighlightBalanceZone(color:Color) { }
	
	function UnhighlightBalanceZone() {}
}