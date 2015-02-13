private var motor : CharacterMotor;

// Use this for initialization
function Awake () {
	motor = GetComponent(CharacterMotor);
}

// Update is called once per frame
function Update () {
	// Get the input vector from keyboard or analog stick
	var directionVector = new Vector3(Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical"));
	
	if (directionVector != Vector3.zero) {
		// Get the length of the directon vector and then normalize it
		// Dividing by the length is cheaper than normalizing when we already have the length anyway
		var directionLength = directionVector.magnitude;
		directionVector = directionVector / directionLength;
		
		// Make sure the length is no bigger than 1
		directionLength = Mathf.Min(1, directionLength);
		
		// Make the input vector more sensitive towards the extremes and less sensitive in the middle
		// This makes it easier to control slow speeds when using analog sticks
		directionLength = directionLength * directionLength;
		
		// Multiply the normalized direction vector by the modified length
		directionVector = directionVector * directionLength;
	}
	
	// Apply the direction to the CharacterMotor. If climbing, we want the left and right vectors to be
	// relative to the current up of our transform and treat the climb normal as a backward direction
	if(motor.climbing) {
		// TODO deal with forwards/backwards movment while climbing.
		var upDown: float = 0;
		if(Input.GetKey("e")) {
			upDown = 1.0;
		}
		if(Input.GetKey("q")) {
			upDown = -1.0;
		}
		directionVector = Vector3(directionVector.x,upDown,0);
		var newInputDirection = Quaternion.LookRotation(-1*motor.climbingNormal,transform.up) * directionVector;

		motor.inputMoveDirection = newInputDirection;
	}
	else
		motor.inputMoveDirection = transform.rotation * directionVector;
	motor.inputJump = Input.GetButton("Jump");
}

// Require a character controller to be attached to the same game object
@script RequireComponent (CharacterMotor)
@script AddComponentMenu ("Character/FPS Input Controller")
