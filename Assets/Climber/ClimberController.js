﻿#pragma strict

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
	
    var hopVelocity = 7.0;
    
	// Falling Properties
	var gravity: float = 9.8;

	// Camera Look Objects
	var cameraMouseLook: MouseLook;
	var transformMouseLook: MouseLook;
	
	// Climber Look Properties
	var climbSightFlashTime = 1.5;
	var climbSightFlashColor = Color.gray;
	var climbTintValue = 0.0;
	var climbMaterial: Material;
	var climbTintUp: boolean = true;
	var reticle: GUITexture;
	var dynoReticle: GUITexture = GUITexture();
	private var flashing: boolean = false;
	private var flashAmount: float = 1.0;
	private var flashFrequency: float = 1.25;
	private var flashIncreasing: boolean = false;
	
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
		
		// Perform Climbing Movement
		if (climbing) {
            velocityChange = ClimbMovement(inputMovement,velocityChange);
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
		var startPosition = transform.position;
		controller.Move(velocityChange*Time.deltaTime);
		
		var previousVelocity = velocity;
		velocity = (transform.position - startPosition)/Time.deltaTime;
		
		lastPosition = transform.position;
	}
	
	function OnGUI() {
		// Draw Reticle
		var reticleRaycastInfo: RaycastHit;
		// If we're looking at a rock that is within grab range, flash the reticle
		if(Physics.Raycast(transform.position,cameraMouseLook.transform.forward,reticleRaycastInfo)) {
			if( reticleRaycastInfo.collider.GetComponent(RockInfo) != null &&
				(reticleRaycastInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(reticleRaycastInfo.textureCoord) && 
				reticleRaycastInfo.distance <= climbingHoldCheckDistance) {
				
				// Set starting flash properties
				if(!flashing) {
					flashing = true;
					flashAmount = 1.0;
					flashIncreasing = false;
				}
				
				// Modify Flash amount
				if(flashIncreasing) {
					flashAmount += 0.5*flashFrequency*Time.deltaTime;
					if (flashAmount > 1) {
						flashAmount = 1;
						flashIncreasing = false;
					}
				}
				else {
					flashAmount -= 0.5*flashFrequency*Time.deltaTime;
					if (flashAmount < 0) {
						flashAmount = 0;
						flashIncreasing = true;
					}
				}
				
				// Change color of reticle
				reticle.color = Color.gray*(1-flashAmount) + Color.blue*flashAmount;
			}
			else {
				flashing = false;
				reticle.color = Color.gray;
			}
		}
		else {
			flashing = false;
			reticle.color = Color.gray;
		}
		
		// Draw Dyno Fullness
		if(currentDynoCharge >= 0) {
			reticle.color = Color.gray*(1-(currentDynoCharge/100)) + Color.yellow*(currentDynoCharge/100);
		} 
			
		// Draw Energy Bar
		var barFullness = Screen.width * energy / startingMaximumEnergy;
		GUI.color = Color.green;
		GUI.Button(Rect(0,0,barFullness,15),"");
		
		// Draw unfilled energy bar
		var barEmpty = Screen.width * (maximumEnergy - energy) / startingMaximumEnergy;
		GUI.color = Color.black;
		GUI.Button(Rect(barFullness,0,barFullness + barEmpty,15),"");
		
		// Draw damaged energy bar
		GUI.color = Color.red;
		GUI.Button(Rect(barFullness + barEmpty,0,Screen.width - (barFullness + barEmpty),15),"");
		GUI.color = Color.black;
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
	/*		var damage = (fallDistance - maximumUninjuredFallDistance) / (maximumSurvivalDistance - maximumUninjuredFallDistance);
			damage = Mathf.Max(damage * startingMaximumEnergy,0);
				
			// Inflict Damage
			maximumEnergy -= damage;*/
		} 
	}
	
	function GetClimbDirection(inputDirection: Vector3) : ClimbHitInfo {
		var climbInfo: ClimbHitInfo = ClimbHitInfo();
		var directionChangeAngle = 10.0;
		
		// first, check the standard ray
		var standardHitInfo: RaycastHit;
		var standardHit = Physics.Raycast(transform.position+(inputDirection*Time.deltaTime),-climbingNormal,standardHitInfo,climbingHoldCheckDistance);
			
		// if we found a climbable angle
		if ( standardHit && 
			 standardHitInfo.collider.GetComponent(RockInfo) != null &&
			(standardHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(standardHitInfo.textureCoord)) {
			climbInfo.normal = standardHitInfo.normal;
			climbInfo.climbDirection = inputDirection;
			climbInfo.distance = standardHitInfo.distance;
			return (climbInfo);
		}
		
		// TODO make this work
		// Next, check to see if we're climbing around a corner, but only if we failed to find any rock at all when climbing standard
		if(!standardHit) {
			Debug.Log("Performign Corner Check");
			Debug.Log("Climbing Normal:  "+climbingNormal);
			Debug.Log("input direction normalized: " + inputDirection.normalized);
			directionChangeAngle = 90;
			while(directionChangeAngle >= 30) {
				var cornerRotation = Quaternion.AngleAxis(directionChangeAngle,Vector3.Cross(climbingNormal,inputDirection));
				var cornerHitInfo: RaycastHit;
				var pivotPoint = transform.position + (inputDirection*Time.deltaTime) - (1.1*climbingNormal*climbingHoldCheckDistance);
				var pivotModifier = cornerRotation*(transform.position - pivotPoint);
				var postPivotTransform = pivotPoint + pivotModifier;
				var cornerHit = Physics.Raycast(postPivotTransform,-(cornerRotation*climbingNormal),cornerHitInfo,climbingHoldCheckDistance*1.1);
			
				Debug.Log("rotation : "+ cornerRotation );
				Debug.Log("rotation axis: " + Vector3.Cross(climbingNormal,inputDirection));
				Debug.Log("Check direction: " +(-(cornerRotation*climbingNormal)));
				Debug.Log("check position : "+postPivotTransform);
			
				// if we found a climbable angle
				if ( cornerHit && 
				 	cornerHitInfo.collider.GetComponent(RockInfo) != null &&
					(cornerHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(cornerHitInfo.textureCoord)) {
					
					climbInfo.normal = cornerHitInfo.normal;
					climbInfo.climbDirection = postPivotTransform - transform.position; //cornerRotation * inputDirection;
					climbInfo.distance = cornerHitInfo.distance;
					
					Debug.Log("corner");
					Debug.Log(climbInfo.climbDirection);
					
					// Move self to be in the proper position
					//transform.position = cornerHitInfo.point + cornerHitInfo.normal*climbingHoldActualDistance;
					targetLerpPosition = cornerHitInfo.point + cornerHitInfo.normal*climbingHoldActualDistance;
                    lerpingPosition = true;
                    
					return (climbInfo);
				}
				else {
					Debug.Log("no corner hit");
				}
				
				directionChangeAngle -= 10;
			}
		} // end corner check
		
		directionChangeAngle = 10;
		
		while(directionChangeAngle < 90) {
			var leftRotation = Quaternion.AngleAxis(directionChangeAngle,climbingNormal);
			var leftHitCheckVector = leftRotation * inputDirection;
			var leftHitInfo: RaycastHit;
			var leftHit = Physics.Raycast(transform.position+(leftHitCheckVector*Time.deltaTime),-climbingNormal,leftHitInfo,climbingHoldCheckDistance);
			
			// if we found a climbable angle
			if ( leftHit && 
				 leftHitInfo.collider.GetComponent(RockInfo) != null &&
				(leftHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(leftHitInfo.textureCoord)) {
				climbInfo.normal = leftHitInfo.normal;
				climbInfo.climbDirection = leftHitCheckVector;
				climbInfo.distance = leftHitInfo.distance;
				return (climbInfo);
			}
			
			var rightRotation = Quaternion.AngleAxis(-directionChangeAngle,climbingNormal);
			var rightHitCheckVector = rightRotation * inputDirection;
			var rightHitInfo: RaycastHit;
			var rightHit = Physics.Raycast(transform.position+(rightHitCheckVector*Time.deltaTime),-climbingNormal,rightHitInfo,climbingHoldCheckDistance);
			
			// if we found a climbable angle
			if ( rightHit && 
				 rightHitInfo.collider.GetComponent(RockInfo) != null &&
				(rightHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(rightHitInfo.textureCoord)) {
				climbInfo.normal = rightHitInfo.normal;
				climbInfo.climbDirection = rightHitCheckVector;
				climbInfo.distance = rightHitInfo.distance;
				return( climbInfo );
			}
			
			// increment angle
			directionChangeAngle += 10.0;
		}
		
		// if we failed, return a zero vector
		climbInfo.climbDirection = Vector3.zero;
		climbInfo.normal = climbingNormal;
		climbInfo.distance = climbingHoldActualDistance;
		return( climbInfo);
	}
	
	function HandleDamage(velocityChange: Vector3) {
		// if the damage buffer is on, just return
		if(damageBufferOn) {
			damageBufferOn = false;
			return;
		}
		
		// Get core damage
		var fallDistance = Mathf.Pow(velocityChange.magnitude,2) / (2 * gravity);
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
	
	/*function LerpPosition() : boolean {
		// This method returns true if we're lerping, false if we're not
		if(lerpingPosition) {
			transform.position = Vector3.Lerp(transform.position,targetLerpPosition,8*Time.deltaTime);
			if(Vector3.Distance(transform.position,targetLerpPosition) < 0.05)
				lerpingPosition = false;
			
			return true;
		}
		else {
			return false;
		}
	} */
    
    function ClimbMovement(inputMovement:Vector3,velocityChange:Vector3) : Vector3 {
		// Climb Movement Vector
		var expectedClimbMovement = Vector3(inputMovement.x,inputMovement.z,0) * climbSpeed;// * Time.deltaTime;
		expectedClimbMovement = transform.rotation*expectedClimbMovement;
		// if we're charging a dyno, we cannot move
		if (currentDynoCharge >= 0) {
			expectedClimbMovement = Vector3.zero;
		}
		
		// Lose energy
		var climbAngle = Vector3.Angle(climbingNormal,Vector3.down);
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
		
		// Start dynoing
		if(currentDynoCharge < 0 && Input.GetKeyDown("space")) {
			currentDynoCharge = 0.0;
		}
		else if (currentDynoCharge >= 0 && Input.GetKey("space")) {
			currentDynoCharge += Time.deltaTime / maximumDynoChargeTime * 100;
			currentDynoCharge = Mathf.Min(currentDynoCharge,100);
		}
		
		// store the camera rotation
		var storedRotation = cameraMouseLook.transform.rotation;
		
		// Check to see if we should stop climbing
		if((tool == ClimberTool.Hand && Input.GetMouseButtonDown(1)) ||
		   Vector3.Angle(climbingNormal,Vector3.up) < mildestClimbAngle ||
		   energy <= 0 ||
		   (currentDynoCharge > 0 && Input.GetKeyUp("space"))) {
			// Let go
			climbing = false;
			groundNormal = Vector3.zero;
            
            toolDisplay.Deactivate(ClimberTool.Hand);
			
			// Carry momentum
			velocityChange += expectedClimbMovement;
			
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
		} // end end climbing block
		else {
			// Check climbing normal by raycast
			//if(!LerpPosition()) {
            if(!lerpingPosition) {
			    var climbInfo = GetClimbDirection(expectedClimbMovement);
			    if (climbInfo.climbDirection != Vector3.zero) {
					// Perform Movement
				    velocityChange += climbInfo.climbDirection;
				
					// Lengthen the thether if we're tethered.
				    if(tether != null && tether.tethered) {
				        tether.tetherLength = 1.0 + Vector3.Distance(transform.position,tether.attachmentPoints[tether.attachmentPoints.Count - 1]);
				    }
			
				    // Adjust transform if the climbing Normal changed
				    if(climbInfo.normal != climbingNormal) {
					    // Cross climbing Normal and the up vector
					    climbingNormal = climbInfo.normal;
					    var climbingUpCross = Vector3.Cross(climbingNormal,Vector3.up);
				
					    // Generate new local up by finding climbing Up Cross
					    var localUp = Vector3.Cross(climbingUpCross,climbingNormal);
				    
					    // Set new rotation and save camera transform rotation
					    targetRotation = Quaternion.LookRotation(-climbingNormal,localUp.normalized);
				    }
			    }
			}
            else {
                LerpPosition();
                climbInfo = ClimbHitInfo();
                climbInfo.distance = climbingHoldActualDistance;
            }
			
			// adjust rotation
			transform.rotation = Quaternion.Lerp(transform.rotation,targetRotation,0.1);
			
			// And set yourself to be a valid distance away
			var holdDifference = climbingHoldActualDistance - climbInfo.distance;
			controller.Move(Mathf.Clamp(holdDifference,-.1,.1) * climbingNormal);
		}
        
        return (velocityChange);
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
			
			// rotate into place
			var targetLocation = grabRayHit.point + climbingNormal*climbingHoldActualDistance;
			controller.Move(targetLocation - transform.position);
			
			// turn on damage buffer so we don't hurt ourselves from dynoing
			damageBufferOn = true;
				
			// Set Camera Looks
			cameraMouseLook.axes = RotationAxes.MouseXAndY;
			transformMouseLook.enabled = false;
			
			// Change the target rotation so we look in the correct direction.
			var climbingUpCross2 = Vector3.Cross(climbingNormal,Vector3.up);
				
			// Generate new local up by finding climbing Up Cross
			var localUp2 = Vector3.Cross(climbingUpCross2,climbingNormal);
				
			// Set new rotation and save camera transform rotation
			targetRotation = Quaternion.LookRotation(-climbingNormal,localUp2.normalized);
            
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
    
    function LerpPosition() {
        var startPos = transform.position;
        transform.position = Vector3.Lerp(transform.position,targetLerpPosition,12*Time.deltaTime);
        Debug.Log("lerping...lerpVector: "+ (transform.position - startPos));
        if(Vector3.Distance(transform.position,targetLerpPosition) <= 12*Time.deltaTime) {
            lerpingPosition = false;
            Debug.Log("lerp target reached");
        }
    }
}

@script RequireComponent (CharacterController)
