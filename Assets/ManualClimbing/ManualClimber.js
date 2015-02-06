#pragma strict

class ManualClimber extends MonoBehaviour {
	// For now, this will work just in two dimensions
	
	// Properties
	var footPosition = Vector3(0,-1,0);
	var handPosition = Vector3(0,1,0);
	var footRadius:float = 1;
	var handRadius:float = 1;
	
	var centerOfBalance = Vector3.zero;
	
	var maximumStretch = 3.5;
	var maximumCenterOfBalanceOffset = 1.5;
	
	private var holdMovementSpeed:float = 3;
	private var maxHoldMovementSpeed:float = 3;
	private var minHoldMovementSpeed:float = 0.5;
	
	var maximumHoldMovementWithoutCenterOfBalanceAdjustment = 0.05;
	
	var footContactPoint:Vector3 = footPosition;
	var handContactPoint:Vector3 = handPosition;
	
	var startingHandHold: GenericHold;
	var startingFootHold: GenericHold;
	
	private var currentHandhold: GenericHold = startingHandHold;
	private var currentFoothold: GenericHold = startingFootHold;
	
	var moveSpeed = 1.5;
	
	// Methods
	function Start() {
		// Establish Handholds and Footholds
		currentHandhold = startingHandHold;
		currentFoothold = startingFootHold;
		
		GrabHandhold(startingHandHold,startingHandHold.transform.position);
		GrabFoothold(startingFootHold,startingFootHold.transform.position);
		
		// Lock Mouse cursor
		Screen.lockCursor = true;
	}
	
	function GrabHandhold(hold: GenericHold,contactPoint:Vector3) {
		// check to see if the hold is within our reach
		if(Vector3.Distance(contactPoint,transform.TransformPoint(handPosition)) <= handRadius &&
		   Vector3.Distance(contactPoint,footContactPoint) <= maximumStretch /* &&
		   IsPointInHandAndFootBalanceZones(hold,currentFoothold,contactPoint,footContactPoint) */ ) {
			// grab the hold
			handContactPoint = contactPoint;
			
			if(currentHandhold != null) 
				currentHandhold.UnhighlightBalanceZone();	
			
			currentHandhold = hold;
			currentHandhold.HighlightBalanceZone(Color.blue);
			
			// center yoself
			//CenterInBalanceZones();
			CenterBetweenContactPoints();
		}
	}
	
	function GrabFoothold(hold: GenericHold,contactPoint:Vector3) {
		// check to see if the hold is within our reach
		if(Vector3.Distance(contactPoint,transform.TransformPoint(footPosition)) <= footRadius &&
		   Vector3.Distance(contactPoint,handContactPoint) <= maximumStretch /* &&
		   IsPointInHandAndFootBalanceZones(currentHandhold,hold,handContactPoint,contactPoint) */ ) {
			// grab the hold
			footContactPoint = contactPoint;
			
			if(currentFoothold != null) 
				currentFoothold.UnhighlightBalanceZone();	
			
			currentFoothold = hold;
			currentFoothold.HighlightBalanceZone(Color.green);
			
			// Center yoself
			//CenterInBalanceZones();
			CenterBetweenContactPoints();
		}
	}
	
	function MoveLockedHolds() {
		// Calculate hand and foot movement
		var handMovement = Vector3.Lerp(transform.TransformPoint(handPosition),handContactPoint,8*Time.deltaTime);
		
		// Calculate hand and foot movement
		var footMovement = Vector3.Lerp(transform.TransformPoint(footPosition),footContactPoint,8*Time.deltaTime);
		
		// Move self to the center of hand and foot positions
		var rotation = Quaternion.LookRotation(transform.forward,handMovement - footMovement);
		transform.position = (handMovement + footMovement)/2;
		transform.rotation = rotation;
	}
	
	function GrabCheck() {
		var hitInfo : RaycastHit;
		var cam: Camera;
		var hold: Hold;
		if(Input.GetMouseButtonDown(0)) {
			// if we clicked a hold, hand grab it
			cam = GetComponentInChildren(Camera);
			if(Physics.Raycast(cam.ScreenPointToRay(Vector3(Screen.width/2,Screen.height/2,0)),hitInfo)) {
				hold = hitInfo.collider.GetComponent(Hold) as Hold;
				if(hold != null)
					GrabHandhold(hold,hitInfo.point);
			}
		}
		if(Input.GetMouseButtonDown(1)) {
			// if we clicked a hold, hand grab it
			cam = GetComponentInChildren(Camera);
			if(Physics.Raycast(cam.ScreenPointToRay(Vector3(Screen.width/2,Screen.height/2,0)),hitInfo)) {
				hold = hitInfo.collider.GetComponent(Hold) as Hold;
				if(hold != null)
					GrabFoothold(hold,hitInfo.point);
			}
		}
	}
	
	function MoveAlongHolds() : boolean {
		var maxMovement: float = 0;
		
		holdMovementSpeed = minHoldMovementSpeed + (maxHoldMovementSpeed * (180 - Vector3.Angle(Vector3.up,transform.up)) / 180);
		
		// Move along handholds
		var tempContactPoint = currentHandhold.MoveContactPoint(handContactPoint,holdMovementSpeed,transform.rotation);
		if(Vector3.Distance(tempContactPoint,footContactPoint) <= maximumStretch) {
			maxMovement = Vector3.Distance(handContactPoint,tempContactPoint);
			handContactPoint = tempContactPoint;
		}
		
		// Move along footholds
		tempContactPoint = currentFoothold.MoveContactPoint(footContactPoint,holdMovementSpeed,transform.rotation);
		if(Vector3.Distance(tempContactPoint,handContactPoint) <= maximumStretch) {
			maxMovement = Mathf.Max(maxMovement,Vector3.Distance(footContactPoint,tempContactPoint));
			footContactPoint = tempContactPoint;
		}
		
		// return true if we should allow center of balance adjustment
		if(Mathf.Approximately(maxMovement,0))
			return(true);
		else {
			return(false);
		}
	}
	
	function MoveCenterOfBalance(movementVector:Vector3) : Vector3 {
		var startingCenter = transform.position;
		
		// Move center of balance, provided that it doesn't move it outside of the balance zones
		// TODO: have a limit on center of balance offset
		var tempCenterOfBalance = transform.TransformPoint(movementVector);
		tempCenterOfBalance = currentHandhold.MovePointWithinBalanceZone(tempCenterOfBalance);
		tempCenterOfBalance = currentFoothold.MovePointWithinBalanceZone(tempCenterOfBalance);
		
		if(Vector3.Distance(tempCenterOfBalance,(handContactPoint + footContactPoint)/2) <= maximumCenterOfBalanceOffset) {
			transform.position = tempCenterOfBalance;
		
			// return the actual movement vector
			return(tempCenterOfBalance - startingCenter);
		}
		else {
			tempCenterOfBalance = Vector3.MoveTowards(tempCenterOfBalance,(handContactPoint + footContactPoint)/2,Vector3.Distance(tempCenterOfBalance,(handContactPoint + footContactPoint)/2) - maximumCenterOfBalanceOffset);
		
			transform.position = tempCenterOfBalance;
		
			// return the actual movement vector
			return(tempCenterOfBalance - startingCenter);
		}
	}
	
	function MoveContactPoints(movementVector:Vector3) {
		// Move along handholds
		var tempContactPoint = currentHandhold.MoveContactPoint(handContactPoint,movementVector);
		if(Vector3.Distance(tempContactPoint,footContactPoint) <= maximumStretch) 
			handContactPoint = tempContactPoint;
		
		// Move along footholds
		tempContactPoint = currentFoothold.MoveContactPoint(footContactPoint,movementVector);
		if(Vector3.Distance(tempContactPoint,handContactPoint) <= maximumStretch)
			footContactPoint = tempContactPoint;
	}
	
	function MoveHoldsAndCenterOfBalance() {
		// Get movement Vector
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
		
		movementVector *= Time.deltaTime * 3;
		
		movementVector = MoveCenterOfBalance(movementVector);
		MoveContactPoints(movementVector);
	}
	
	function CenterInBalanceZones() {
		// If the hand contact point is within the foot contact point balance zone and vise verse, just center at the midpoint
		var handWithinFootBalanceZone = currentFoothold.IsPointWithinBalanceZone(handContactPoint);
		var footWithinHandBalanceZone = currentHandhold.IsPointWithinBalanceZone(footContactPoint);
		
		var footUsePoint: Vector3;
		var handUsePoint: Vector3;
		
		var raycastHit:RaycastHit;
		
		if(handWithinFootBalanceZone) {
			handUsePoint = handContactPoint;
		}
		else {
			handUsePoint = currentFoothold.GetHitPointOnBalanceZone(Ray(handContactPoint,footContactPoint-handContactPoint));
		}
		
		if(footWithinHandBalanceZone) {
			footUsePoint = footContactPoint;
		}
		else {
			footUsePoint = currentHandhold.GetHitPointOnBalanceZone(Ray(footContactPoint,handContactPoint-footContactPoint));
		}
		
		// transform is center of these two points
		transform.position = (footUsePoint + handUsePoint) / 2;
	}
	
	function CenterBetweenContactPoints() {
		transform.position = Vector3.Lerp(transform.position,(handContactPoint+footContactPoint)/2,5);
	}
	
	function IsPointInHandAndFootBalanceZones(handhold: GenericHold, foothold: GenericHold,handPoint:Vector3,footPoint:Vector3) {
		// If the hand contact point is within the foot contact point balance zone and vise verse, just center at the midpoint
		var handWithinFootBalanceZone = foothold.IsPointWithinBalanceZone(handPoint);
		var footWithinHandBalanceZone = handhold.IsPointWithinBalanceZone(footPoint);
				
		var footUsePoint: Vector3;
		var handUsePoint: Vector3;
		
		var raycastHit:RaycastHit;
		
		if(handWithinFootBalanceZone) {
			handUsePoint = handPoint;
		}
		else {
			handUsePoint = foothold.GetHitPointOnBalanceZone(Ray(handPoint,footPoint-handPoint));
		}
		
		if(footWithinHandBalanceZone) {
			footUsePoint = footPoint;
		}
		else {
			footUsePoint = handhold.GetHitPointOnBalanceZone(Ray(footPoint,handPoint-footPoint));
		}
		
		// transform is center of these two points
		var midpoint = (footUsePoint + handUsePoint) / 2;
		
		return(handhold.IsPointWithinBalanceZone(midpoint) && foothold.IsPointWithinBalanceZone(midpoint));
	}
	
	function Update() {
		MoveAlongHolds();
	//	MoveHoldsAndCenterOfBalance();
		MoveLockedHolds();
		GrabCheck();
	}
}