#pragma strict

class ClimbHitInfo {
	var climbDirection: Vector3;
	var normal: Vector3;
	var distance: float;
}

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
	var groundThreshold = 0.1;
	var lastHitPoint: Vector3;
	var hitPoint: Vector3;
	var steepestWalkAngle = 60.0;
	
	// Jumping Properties
	var maximumDynoChargeTime = 2.0;
	var maximumDynoVelocity = 12.0;
	var maximumDynoEnergyCost = 20.0;
	var currentDynoCharge = -1.0;
	
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
	var maximumUninjuredFallDistance = 5.0;
	var maximumSurvivalDistance = 45.0;
	
	// Tether
	var tether:Tether = null;
	var maximumEnergyRecoverSwingingVelocity = 1.0;
	var tetheredEnergyRecoveryDelay = 3.5;
	private var tetheredEnergyRecoveryTimer = 0.0;
	
	var maximumImpulseStartVelocity = 0.5;
	var impulseVelocity = 5.0;
	var impulseEnergyCost = 5.0;
	
	
	// Methods
	function Start() {
		Screen.showCursor = false;
		tether = GetComponent(Tether);
	}
	
	function Update() {
		// Do climb tinting
		if (climbTintUp) {
			climbTintValue += climbSightFlashTime * Time.deltaTime;
			if (climbTintValue > 1)
				climbTintUp = false;
		}
		else {
			climbTintValue -= climbSightFlashTime * Time.deltaTime;
			if (climbTintValue < 0)
				climbTintUp = true;
		}
		
		climbTintValue = Mathf.Clamp(climbTintValue,0,1);
			
		// Get input
		var inputMovement = Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("3rdMovement"), Input.GetAxis("Vertical"));
		var velocityChange: Vector3 = Vector3.zero;
		
		// Perform Climbing Movement
		if (climbing) {
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
			if(Input.GetMouseButtonDown(0) ||
			   Vector3.Angle(climbingNormal,Vector3.up) < mildestClimbAngle ||
			   energy <= 0 ||
			   (currentDynoCharge > 0 && Input.GetKeyUp("space"))) {
				// Let go
				climbing = false;
				groundNormal = Vector3.zero;
				
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
				} // end dyno block
			} // end end climbing block
			else {
				// Check climbing normal by raycast
				var climbInfo = GetClimbDirection(expectedClimbMovement);
				if (climbInfo.climbDirection != Vector3.zero) {
					// Perform Movement
					velocityChange += climbInfo.climbDirection;
					
					// Lengthen the thether if we're tethered.
					if(tether != null && tether.tethered) {
						tether.tetherLength += velocityChange.magnitude * Time.deltaTime;
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
				
				// adjust rotation
				transform.rotation = Quaternion.Lerp(transform.rotation,targetRotation,0.1);
				
				// And set yourself to be a valid distance away
				var holdDifference = climbingHoldActualDistance - climbInfo.distance;
				controller.Move(Mathf.Clamp(holdDifference,-.1,.1) * climbingNormal);
			}
		}
		else {
			// Check to see if we clicked to grab the rock. If so, grab on
			var grabRayHit: RaycastHit;
			if(	Input.GetMouseButtonDown(0) && 
				energy > 0 &&
				Physics.Raycast(transform.position,cameraMouseLook.transform.forward,grabRayHit,climbingHoldCheckDistance) &&
				grabRayHit.collider.GetComponent(RockInfo) != null &&
				(grabRayHit.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(grabRayHit.textureCoord)) {
				
				// grab the rock
				climbing = true;
				climbingNormal = grabRayHit.normal;
				
				// rotate into place
				var targetLocation = grabRayHit.point + climbingNormal*climbingHoldActualDistance;
				controller.Move(targetLocation - transform.position);
					
				// Set Camera Looks
				cameraMouseLook.axes = RotationAxes.MouseXAndY;
				transformMouseLook.enabled = false;
				
				// Change the target rotation so we look in the correct direction.
				var climbingUpCross2 = Vector3.Cross(climbingNormal,Vector3.up);
					
				// Generate new local up by finding climbing Up Cross
				var localUp2 = Vector3.Cross(climbingUpCross2,climbingNormal);
					
				// Set new rotation and save camera transform rotation
				targetRotation = Quaternion.LookRotation(-climbingNormal,localUp2.normalized);
			}
			else {
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
				
					transform.rotation = Quaternion.LookRotation(Vector3.Cross(cameraMouseLook.transform.right,Vector3.up),Vector3.up); //
					cameraMouseLook.transform.rotation = transform.rotation;
					cameraMouseLook.transform.RotateAround(cameraMouseLook.transform.position,cameraMouseLook.transform.right,storedAngle);
				}
				
				groundNormal = Vector3.zero;
				
				if (grounded) {
					// increase energy
					energy += energyRechargeRate * Time.deltaTime;
					energy = Mathf.Min(energy,maximumEnergy);
				
					// Move according to the ground normals
					inputMovement.y = 0;
					inputMovement *= walkSpeed;
					inputMovement = transform.rotation*inputMovement;//*Time.deltaTime;
					

					// If walking down a slope, we need to push down
					var pushDownOffset : float = Mathf.Min(controller.stepOffset, Vector3(velocity.x * Time.deltaTime, 0, velocity.z * Time.deltaTime).magnitude);
					velocityChange -= pushDownOffset/Time.deltaTime * Vector3.up;
					
					// Perform normal movement
					velocityChange += inputMovement;
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
			}
		}
		
		// apply tether
		if(tether != null) {
			velocityChange = tether.ApplyTether(velocityChange);
		}
		
		var startPosition = transform.position;
		controller.Move(velocityChange*Time.deltaTime);
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
			var damage = (fallDistance - maximumUninjuredFallDistance) / (maximumSurvivalDistance - maximumUninjuredFallDistance);
			damage = Mathf.Max(damage * startingMaximumEnergy,0);
				
			// Inflict Damage
			maximumEnergy -= damage;
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
		/*if(!standardHit) {
			while(directionChangeAngle <= 90) {
				var cornerRotation = Quaternion.AngleAxis(directionChangeAngle,Vector3.Cross(climbingNormal,inputDirection));
				var cornerHitInfo: RaycastHit;
				var pivotPoint = transform.position + climbingNormal*1.8;
				var pivotModifier = cornerRotation*(transform.position - pivotPoint);
				var postPivotTransform = pivotPoint + pivotModifier;
				var cornerHit = Physics.Raycast(postPivotTransform,-(cornerRotation*climbingNormal),cornerHitInfo,climbingHoldCheckDistance);
			
				// if we found a climbable angle
				if ( cornerHit && 
				 	cornerHitInfo.collider.GetComponent(RockInfo) != null &&
					(cornerHitInfo.collider.GetComponent(RockInfo) as RockInfo).IsPointClimbable(cornerHitInfo.textureCoord)) {
					climbInfo.normal = cornerHitInfo.normal;
					climbInfo.climbDirection = postPivotTransform - transform.position; //cornerRotation * inputDirection;
					climbInfo.distance = cornerHitInfo.distance;
					
					Debug.Log(climbInfo.climbDirection);
					return (climbInfo);
				}
				
				directionChangeAngle += 10;
			}
		} // end corner check
		
		*/
		
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
	
	function OnCollisionEnter(collision : Collision) {
		
	}
}

@script RequireComponent (CharacterController)
