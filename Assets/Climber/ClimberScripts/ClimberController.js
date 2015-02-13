#pragma strict

class ClimbHitInfo {
	var climbDirection: Vector3;
	var normal: Vector3;
	var distance: float;
    var hitPoint: Vector3;
}

enum ClimberTool { Hand, Rope };

class ClimberController extends MonoBehaviour {

	// Properties
	var controller: CharacterController;
	
	//  Movement Properties
	var walkSpeed = 4.0;
	var climbSpeed = 4.0;
	var lastPosition: Vector3;
	var velocity: Vector3;
	
	//	Climbing Properties
	var climbing: boolean = false;
	var climbingHoldCheckDistance: float = 1.3;
	var climbingHoldActualDistance: float = 1.2;
	var climbingNormal: Vector3 = Vector3.zero;
	var mildestClimbAngle = 30.0;
	var targetRotation: Quaternion;
    
    private var contactPoint: Vector3;
    private var contactDirection: Vector3;
    private var targetContactDistance = 1.2;
    private var rotationalSpeedModifier = 0.8;
    
    private var rotationPivotDepth = 0.1;
	
	// Walking Properties
	var groundNormal: Vector3 = Vector3.zero;
	var lastGroundNormal: Vector3 = Vector3.zero;
	var grounded: boolean = false;
	var groundThreshold = 0.01;
	var lastHitPoint: Vector3;
	var hitPoint: Vector3;
	var steepestWalkAngle = 60.0;
	
	// Jumping Properties
	var maximumDynoChargeTime = 2.0;
	var maximumDynoVelocity = 12.0;
	var maximumDynoEnergyCost = 20.0;
	var currentDynoCharge = -1.0;
	
    var hopVelocity = 5.0;
    
	// Falling Properties
	var gravity: float = 9.8;

	// Camera Look Objects
	var cameraMouseLook: MouseLook;
	var transformMouseLook: MouseLook;
	
	// Energy Properties
	var startingMaximumEnergy = 100.0;
	var maximumEnergy = startingMaximumEnergy;
	var energy = maximumEnergy;
	var motionlessEnergyLossRate = 0.7;
	var movingEnergyLossRate = 2.0;
	var maximumOverhangMultiplier = 2.0;
	var minimumSlabMultiplier = 0.5;
	var energyRechargeRate = 15.0;
	
	// Damage Properties
	private var smallFallDistance = 5.0;
	private var mediumFallDistance = 12.0;
	private var largeFallDistance = 25.0;
	private var lethalFallDistance = 35.0;
	
	private var smallFallDamageUnit = 1.0;
	private var mediumFallDamageUnit = 2.0;
	private var largeFallDamageUnit = 4.0;
	private var lethalFallDamageUnit = 5.0;
	
	private var lethalityThresholdPercentage = 0.5;	// When you have less than this percent of your maximum energy and take a fall, you die no matter what.
	
	private var smallFallDamage = ((1-lethalityThresholdPercentage) * startingMaximumEnergy) * (smallFallDamageUnit/lethalFallDamageUnit);
	private var mediumFallDamage = ((1-lethalityThresholdPercentage) * startingMaximumEnergy) * (mediumFallDamageUnit/lethalFallDamageUnit);
	private var largeFallDamage = ((1-lethalityThresholdPercentage) * startingMaximumEnergy) * (largeFallDamageUnit/lethalFallDamageUnit);
	
	private var damageBufferOn: boolean = false;
	
	private var cameraEffects: ClimberCameraEffects;
	var deathEffect: DeathEffect;
	
	// Tether
	var tether:Tether = null;
	var maximumEnergyRecoverSwingingVelocity = 1.0;
	var tetheredEnergyRecoveryDelay = 3.5;
	private var tetheredEnergyRecoveryTimer = 0.0;
	
	var maximumImpulseStartVelocity = 0.5;
	var impulseVelocity = 5.0;
	var impulseEnergyCost = 5.0;
	
	private var targetLerpPosition : Vector3 = Vector3.zero;
	private var lerpingPosition: boolean = false;
	
    // Tool
    var toolDisplay: ToolDisplay;
    var tool: ClimberTool = ClimberTool.Hand;
	
	// Methods
	function Start() {
		Screen.lockCursor = true;
		tether = GetComponent(Tether);
		cameraEffects = GetComponentInChildren(ClimberCameraEffects);
	}
	
	function Update() {
        // See if the tool changed
        ChangeTool();
        
		// Get input
		var inputMovement = Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("3rdMovement"), Input.GetAxis("Vertical"));
		var velocityChange: Vector3 = Vector3.zero;
		
        var startPosition = transform.position;
		// Perform Climbing Movement
		if (climbing) {
            var tempVelocityChange = ClimbMovement(velocityChange);
            
            // if we're no longer climbing, we want to carry this velocity into our actual momentum
            if(!climbing)
                velocityChange = tempVelocityChange;
		} 
		else {
			// Check to see if we grabbed the rock
            if(!GrabCheck()) {
                // if we didn't grab on, do normal movement
                velocityChange = NormalMovement(inputMovement,velocityChange);
			}
		}
		
		// apply tether
		if(tether != null) {
			velocityChange = tether.ApplyTether(velocityChange);
		}
		
        // Move and Calculate Velocity
		controller.Move(velocityChange*Time.deltaTime);
		
		var previousVelocity = velocity;
		velocity = (transform.position - startPosition)/Time.deltaTime;
		
		lastPosition = transform.position;
	}
	
	function OnControllerColliderHit (hit : ControllerColliderHit) {
		if (hit.normal.y > 0 && hit.normal.y > groundNormal.y && hit.moveDirection.y < 0) {
			if ((hit.point - lastHitPoint).sqrMagnitude > 0.001 || lastGroundNormal == Vector3.zero)
				groundNormal = hit.normal;
			else {
				groundNormal = lastGroundNormal;
			}	
		
			hitPoint = hit.point;
		}
		
		// Inflict Damage
		if(!grounded && !climbing) {
			// Get Normal of collision
			var normal = hit.normal;
		
			// Get collision Speed Vector by projecting velocity onto the collision normal
			var collisionSpeedVector = Vector3.Project(velocity,normal);
		
			// Get core damage
			var fallDistance = Mathf.Pow(collisionSpeedVector.magnitude,2) / (2 * gravity);
			var damage: float = 0;
		
			if(fallDistance >= lethalFallDistance) {
				// Die
				maximumEnergy = 0;
			}
			else if(fallDistance >= largeFallDistance) {
				maximumEnergy -= largeFallDamage;
				cameraEffects.Shake(0.6);
			}
			else if(fallDistance >= mediumFallDistance) {
				maximumEnergy -= mediumFallDamage;
				cameraEffects.Shake(0.4);
			}
			else if(fallDistance >= smallFallDistance) {
				maximumEnergy -= smallFallDamage;
				cameraEffects.Shake(0.2);
			}
		
			// Die
			if(maximumEnergy <= startingMaximumEnergy * lethalityThresholdPercentage) {
				maximumEnergy = 0;
			
			    // Create Death Effect and disable yourself
                deathEffect.EndScene();
			    this.enabled = false;
		    }
        } 
	}
    
    function GrabCheck() : boolean {
		// Check to see if we clicked to grab the rock. If so, grab on
		var grabRayHit: RaycastHit;
		if(	tool == ClimberTool.Hand &&
            Input.GetMouseButtonDown(0) && 
			energy > 0 &&
			Physics.Raycast(transform.position,cameraMouseLook.transform.forward,grabRayHit,climbingHoldCheckDistance) &&
			grabRayHit.collider.GetComponent(RockInfo) != null &&
			(grabRayHit.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(grabRayHit.textureCoord)) {
			
			// grab the rock
			climbing = true;
			climbingNormal = grabRayHit.normal;
            toolDisplay.Activate();
			
			// turn on damage buffer so we don't hurt ourselves from dynoing
			damageBufferOn = true;
				
			// Set Camera Looks
			cameraMouseLook.axes = RotationAxes.MouseXAndY;
			transformMouseLook.enabled = false;
            
            // Set the contact information
            contactPoint = grabRayHit.point;
            contactDirection = grabRayHit.normal;
            
			// Change the target rotation so we look in the correct direction.
			var climbingUpCross2 = Vector3.Cross(contactDirection,Vector3.up);
				
			// Generate new local up by finding climbing Up Cross
			var localUp2 = Vector3.Cross(climbingUpCross2,contactDirection);
            
            var targetPosition = contactPoint + (contactDirection * targetContactDistance);
            controller.Move(targetPosition-transform.position);
            transform.rotation = Quaternion.LookRotation(-contactDirection,localUp2);
            
            return true;
		}
        else {
            return false;
        }
    }
    
    function NormalMovement(inputMovement:Vector3,velocityChange:Vector3) : Vector3 {
        targetLerpPosition = Vector3.zero;
        lerpingPosition = false;
		var previousStepGrounded = grounded;
		// See if we are falling
		if (groundNormal.y > groundThreshold) {
			grounded = true;
		}
		else {
			// We're no longer grounded
			grounded = false;
		}
						
		if (!previousStepGrounded && grounded) {
			// Fix cameras
			cameraMouseLook.axes = RotationAxes.MouseY;
			transformMouseLook.enabled = true;
		
			var storedAngle = Vector3.Angle(transform.forward,cameraMouseLook.transform.forward);
		
			transform.rotation = Quaternion.LookRotation(Vector3.Cross(cameraMouseLook.transform.right,Vector3.up),Vector3.up); 
			cameraMouseLook.transform.rotation = transform.rotation;
			cameraMouseLook.transform.RotateAround(cameraMouseLook.transform.position,cameraMouseLook.transform.right,storedAngle);
						
			// ensure we don't flip about
			if(Vector3.Angle(transform.forward,cameraMouseLook.transform.forward) > 90) {
				cameraMouseLook.transform.RotateAround(cameraMouseLook.transform.position,Vector3.up,180);
			}
		}
		
		var sliding = false;
		var slideVector = Vector3.zero;

		if(Vector3.Angle(Vector3.up,groundNormal) > 45) {
			sliding = true;
			slideVector = groundNormal;
		}
		
        var hopDirection = groundNormal;
		groundNormal = Vector3.zero;
		
		if (grounded) {
			if(sliding) {
				// The direction we're sliding in
				var desiredVelocity = Vector3(slideVector.x, 0, slideVector.z).normalized;
				// Multiply with the sliding speed
				desiredVelocity *= 0.1;
				
				velocityChange += velocity;
				velocityChange += desiredVelocity;
			}
			else { 
				// increase energy
				energy += energyRechargeRate * Time.deltaTime;
				energy = Mathf.Min(energy,maximumEnergy);
		
				// Move according to the ground normals
				inputMovement.y = 0;
				inputMovement *= walkSpeed;
				inputMovement = transform.rotation*inputMovement;//*Time.deltaTime;
			

				// If walking down a slope, we need to push down
				var pushDownOffset : float = Mathf.Max(controller.stepOffset, Vector3(velocity.x * Time.deltaTime, 0, velocity.z * Time.deltaTime).magnitude);
				velocityChange -= pushDownOffset/Time.deltaTime * Vector3.up;
			
				// Perform normal movement
				velocityChange += inputMovement;
			}
			
			// When going uphill, the CharacterController will automatically move up by the needed amount.
			// Not moving it upwards manually prevent risk of lifting off from the ground.
			// When going downhill, DO move down manually, as gravity is not enough on steep hills.
			velocityChange.y = Mathf.Min(velocityChange.y, 0);
            
            // Then check to see if we are jumping and jump if needed
            if(Input.GetKeyDown("space")) {
                // if we're sliding, our jump direction is augmented outward. This is so that we cannot easily jump up a slab.
                velocityChange.y = 0;
                if(sliding)
                    velocityChange += hopDirection*hopVelocity;
                else
                    velocityChange.y = hopVelocity;
            }
		}
		else {
			velocityChange += velocity;
			
			// If we're tethered, we can add impulse forces based on input
			if(tether != null && tether.tethered) {
				// recover energy if we're not swinging super quickly.
				if (velocity.magnitude < maximumEnergyRecoverSwingingVelocity) {
					if(tetheredEnergyRecoveryTimer < tetheredEnergyRecoveryDelay) {
						tetheredEnergyRecoveryTimer += Time.deltaTime;
					}
					else {
						// increase energy
						energy += energyRechargeRate * Time.deltaTime;
						energy = Mathf.Min(energy,maximumEnergy);
					}
				}
				else {
					tetheredEnergyRecoveryTimer = 0;
				}
			
				// If we pressed forward and aren't moving forward very fast, add an impulse force forward
				if(Input.GetKeyDown("w") && Vector3.Project(velocityChange,transform.forward).magnitude < maximumImpulseStartVelocity && energy > impulseEnergyCost) {
					velocityChange += Vector3.Cross(transform.right,tether.GetRopeTensionDirection()) * impulseVelocity;
					energy -= impulseEnergyCost;
				}
			}
		}
		
		velocityChange += Vector3(0,-gravity*(Time.deltaTime),0);

		// Update last ground normal
		lastGroundNormal = groundNormal;
		lastHitPoint = hitPoint;
        
        return velocityChange;
    }
    
    function ChangeTool() {
        if(Input.GetKeyDown("1")) {
            tool = ClimberTool.Hand;
            toolDisplay.ChangeTool(ClimberTool.Hand);
        }
        else if(Input.GetKeyDown("2")) {
            tool = ClimberTool.Rope;
            toolDisplay.ChangeTool(ClimberTool.Rope);
        }
    }
    
    // Methods
    function GetExpectedHorizontalMovement() : Vector3 {
        var expectedMovement = Vector3(Input.GetAxis("Horizontal"), 0, 0);
        expectedMovement = transform.rotation * expectedMovement;
        expectedMovement = expectedMovement * climbSpeed * Time.deltaTime;
        return expectedMovement;
    }
    
    function GetExpectedVerticalMovement() : Vector3 {
        var expectedMovement = Vector3(0, Input.GetAxis("Vertical"), 0);
        expectedMovement = transform.rotation * expectedMovement;
        expectedMovement = expectedMovement * climbSpeed * Time.deltaTime;
        return expectedMovement;
    }
    
    function MoveLinearly(movement: Vector3,hitInfo: RaycastHit) : Vector3 {
        // Move self. Move the contact point exactly as you moved yourself.
        var startPosition = transform.position;
        controller.Move(movement);
        contactPoint = hitInfo.point;
        
        // move ourselves the exact distance away from the wall that we should be
        var correctionalMovement = (contactPoint + (contactDirection * targetContactDistance)) - transform.position;
        controller.Move(correctionalMovement);
        
        // If we found a different normal, make sure to change our contact direction
        if(hitInfo.normal != contactDirection && !(Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),movement.normalized) < 1 || Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),-movement.normalized) < 1)) {
            Debug.Log("Cross: " +Vector3.Cross(hitInfo.normal,contactDirection));
            Debug.Log("Angle : " + Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),movement.normalized));
            var tempContactDirection = Vector3.Slerp(contactDirection,hitInfo.normal.normalized,3*Time.deltaTime);
            var rotation = Quaternion.FromToRotation(contactDirection,tempContactDirection);
            contactDirection = tempContactDirection;
            var newUp = rotation * transform.up;
            
            // calculate new up vector
            transform.rotation = Quaternion.LookRotation(-contactDirection,newUp);
        } 
        else {
            Debug.Log("Workin");
        }
        
        return movement;
    }
    
    function MoveSpherically(movement: Vector3,rotationAxis:Vector3) : Vector3 {
        movement *= rotationalSpeedModifier;
        // Calculate where we should ideally rotate towards
        var pivotPoint = contactPoint + (rotationPivotDepth * (contactPoint - transform.position).normalized);
        var angleToRotate = movement.magnitude * 360 / (2 * Mathf.PI * Vector3.Distance(pivotPoint,transform.position));
        var angleSign = 1.0;
        if(Vector3.Angle(Vector3.Cross(rotationAxis,transform.forward),movement) < 90) {
            angleSign = -1.0;
        }
        var targetContactDirection = Quaternion.AngleAxis(angleSign*angleToRotate,rotationAxis) * contactDirection;
        var targetEndPosition = pivotPoint + (targetContactDirection * Vector3.Distance(pivotPoint,transform.position));
        var rotationalMovement = targetEndPosition - transform.position;
  
        contactDirection = targetContactDirection;
        transform.rotation = Quaternion.LookRotation(-contactDirection,transform.up);
        controller.Move(rotationalMovement);
        return rotationalMovement; 
    }
    
    function MoveHorizontally(expectedHorizontalMovement: Vector3) : Vector3 {
        var raycastHit: RaycastHit;
        var checkDistance = Vector3.Distance(transform.position,contactPoint) + rotationPivotDepth;
        if(expectedHorizontalMovement != Vector3.zero) {
            // Perform a raycast to see if we've found rock
            if(Physics.Raycast(transform.position + expectedHorizontalMovement,-contactDirection,raycastHit,checkDistance) &&
            (raycastHit.normal == contactDirection || Vector3.Angle(raycastHit.normal,expectedHorizontalMovement) >= 90)) {
                MoveLinearly(expectedHorizontalMovement,raycastHit);
            }
            else {
                MoveSpherically(expectedHorizontalMovement,transform.up);
            }
        }
    }
    
    function MoveVertically(expectedMovement: Vector3) : Vector3 {
        var raycastHit: RaycastHit;
        var checkDistance = Vector3.Distance(transform.position,contactPoint) + rotationPivotDepth;
        if(expectedMovement != Vector3.zero) {
            // Perform a raycast to see if we've found rock
            if(Physics.Raycast(transform.position + expectedMovement,-contactDirection,raycastHit,checkDistance) &&
            (raycastHit.normal == contactDirection || Vector3.Angle(raycastHit.normal,expectedMovement) >= 90)) {
                return(MoveLinearly(expectedMovement,raycastHit));
            }
            else {
                return(MoveSpherically(expectedMovement,transform.right));
            }
        }
    }
    
    function ClimbMovement(totalMovement: Vector3) : Vector3 { 
        var expectedHorizontalMovement:Vector3;
        var expectedVerticalMovement:Vector3;

        // if we're dynoing, we can't move
        if(DynoCheck()) {
            expectedHorizontalMovement = Vector3.zero;
            expectedVerticalMovement = Vector3.zero;
        }
        else {
            expectedHorizontalMovement = GetExpectedHorizontalMovement();
            expectedVerticalMovement = GetExpectedVerticalMovement();
        }
        
        // if we're no longer climbing, return the release momentum
        var releaseMomentum = ClimbReleaseCheck(expectedHorizontalMovement+expectedVerticalMovement);
        if(!climbing)
            return releaseMomentum;
        
        // adjust the movement to make sure we can only climb on climbable rock parts
        var adjustedMovement = AdjustLinearClimbingMovement(expectedHorizontalMovement+expectedVerticalMovement);
        expectedHorizontalMovement = Vector3.Project(adjustedMovement,expectedHorizontalMovement.normalized);
        expectedVerticalMovement = Vector3.Project(adjustedMovement,expectedVerticalMovement.normalized);
        
        UseClimbEnergy(expectedHorizontalMovement+expectedVerticalMovement);
          
        // climb normally  
        totalMovement += MoveHorizontally(expectedHorizontalMovement);
        totalMovement += MoveVertically(expectedVerticalMovement);
        return totalMovement;
    }
    
    function DynoCheck() : boolean {
		// Start dynoing
		if(currentDynoCharge < 0 && Input.GetKeyDown("space")) {
			currentDynoCharge = 0.0;
            return true;
		}
		else if (currentDynoCharge >= 0 && Input.GetKey("space")) {
			currentDynoCharge += Time.deltaTime / maximumDynoChargeTime * 100;
			currentDynoCharge = Mathf.Min(currentDynoCharge,100);
            return true;
		}
        else {
            return false;
        }
    }
    
    function ClimbReleaseCheck(expectedClimbMovement: Vector3) : Vector3 {
        
		// Check to see if we should stop climbing
		if((tool == ClimberTool.Hand && Input.GetMouseButtonDown(1)) ||
		   Vector3.Angle(contactDirection,Vector3.up) < mildestClimbAngle ||
		   energy <= 0 ||
		   (currentDynoCharge > 0 && Input.GetKeyUp("space"))) {
            
            var velocityChange = Vector3.zero;
               
			// Let go
			climbing = false;
			groundNormal = Vector3.zero;
            
            toolDisplay.Deactivate(ClimberTool.Hand);
			
			// Carry momentum
			velocityChange += expectedClimbMovement/Time.deltaTime;
			
			// Apply Dyno
			if (currentDynoCharge > 0 && Input.GetKeyUp("space")) {
				// Calculate dyno energy and velocity
				var dynoEnergyCost = currentDynoCharge / 100 * maximumDynoEnergyCost;
				var dynoVelocity: float;
				// if we don't have enough energy, use all of the remaining energy
				if (energy < dynoEnergyCost) {
					dynoVelocity = energy/maximumDynoEnergyCost * maximumDynoVelocity;
					energy = 0.0;
				}
				else {
					dynoVelocity = currentDynoCharge / 100 * maximumDynoVelocity;
					// remove energy
					energy -= dynoEnergyCost;
				}
				
				// add this to the velocity change
				velocityChange += dynoVelocity * cameraMouseLook.transform.forward;
				currentDynoCharge = -1.0;
				
				// turn on damage buffer so we don't hurt ourselves from dynoing
				damageBufferOn = true;
			} // end dyno block
            
            return velocityChange;
		}
        
        return Vector3.zero;
    }
    
    function UseClimbEnergy(expectedClimbMovement:Vector3) {
		// Lose energy
		var climbAngle = Vector3.Angle(contactDirection,Vector3.down);
		var climbAngleRatio: float;
		var climbAngleMultiplier: float;
		if (climbAngle <= 90) {
			climbAngleRatio = (90 - climbAngle) / 90;
			climbAngleRatio = Mathf.Clamp(climbAngleRatio,0,1);
			climbAngleMultiplier = 1.0 + (maximumOverhangMultiplier - 1.0) * climbAngleRatio;
		}
		else {
			climbAngleRatio = 1.0 - ((climbAngle - 90) / (90 - mildestClimbAngle)); 
			climbAngleRatio = Mathf.Clamp(climbAngleRatio,0,1);
			climbAngleMultiplier = minimumSlabMultiplier + (climbAngleRatio * (1.0 - minimumSlabMultiplier));
		}
		
		if (expectedClimbMovement == Vector3.zero) {
			energy -= Time.deltaTime * motionlessEnergyLossRate * climbAngleMultiplier;
		}
		else {
			energy -= Time.deltaTime * movingEnergyLossRate * climbAngleMultiplier;
		}
		energy = Mathf.Max(energy,0); 
    }
    
    // This method checks to make sure we can move in the expected direction. If we find no rock, return the same vector - the individual horizontal and vertical components will determine whether we should move linearly or spherically in those directions. If we do hit a rock, adjust the movement to be in the a valid direction with the climb map.
    function AdjustLinearClimbingMovement(expectedClimbMovement:Vector3) : Vector3{
		var directionChangeAngle = 10.0;
        var checkDistance = Vector3.Distance(transform.position,contactPoint) + rotationPivotDepth;
		
		// first, check the standard ray
		var standardHitInfo: RaycastHit;
		var standardHit = Physics.Raycast(transform.position+expectedClimbMovement,-contactDirection,standardHitInfo,checkDistance);
			
		// if we found a climbable angle
		if ( standardHit && 
			 standardHitInfo.collider.GetComponent(RockInfo) != null &&
			(standardHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(standardHitInfo.textureCoord)) {
            
            return(expectedClimbMovement);
		}
        
        // if we didn't hit a rock, return the expected climb movement - the spherical and linear components will handle this on their own.
        if(!standardHit)
            return expectedClimbMovement;
		
		while(directionChangeAngle < 90) {
			var leftRotation = Quaternion.AngleAxis(directionChangeAngle,contactDirection);
			var leftHitCheckVector = leftRotation * expectedClimbMovement;
			var leftHitInfo: RaycastHit;
			var leftHit = Physics.Raycast(transform.position+leftHitCheckVector,-contactDirection,leftHitInfo,checkDistance);
			
			// if we found a climbable angle
			if ( leftHit && 
				 leftHitInfo.collider.GetComponent(RockInfo) != null &&
				(leftHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(leftHitInfo.textureCoord)) {
				
                return leftHitCheckVector;
			}
			
			var rightRotation = Quaternion.AngleAxis(-directionChangeAngle,contactDirection);
			var rightHitCheckVector = rightRotation * expectedClimbMovement;
			var rightHitInfo: RaycastHit;
			var rightHit = Physics.Raycast(transform.position+rightHitCheckVector,-contactDirection,rightHitInfo,checkDistance);
			
			// if we found a climbable angle
			if ( rightHit && 
				 rightHitInfo.collider.GetComponent(RockInfo) != null &&
				(rightHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(rightHitInfo.textureCoord)) {
				
                return rightHitCheckVector;
			}
			
			// increment angle
			directionChangeAngle += 10.0;
		}
		
		// if we failed, return a zero vector
		return(Vector3.zero);
    }
}

@script RequireComponent (CharacterController)
