#pragma strict

class ClimberCameraEffects extends MonoBehaviour {
	// Properties
	var originPosition:Vector3;
 
 	var shake_decay: float;
 	var shake_intensity: float;
    
    private var rotatingSmoothly:boolean = false;
    private var targetLocalRotation:Quaternion;
    private var smoothRotationSpeed:float = 5;
    private var startingLocalRotation:Quaternion;
    private var lerpedAmount:float = 0;
    private var storedParent:Transform;
 
 	// Methods
 	function Update(){
     	if(shake_intensity > 0){
         	transform.localPosition = originPosition + Random.insideUnitSphere * shake_intensity;
         	
        	shake_intensity -= shake_decay;
        	if (shake_intensity <= 0)
 			{
   				transform.localPosition = originPosition;
 			}
     	}
        
        if(rotatingSmoothly)
            RotateAroundForwardAxisToUpwardsRotation();
 	}
 
 	function Shake(intensity: float){
     	originPosition = transform.localPosition;
     	shake_intensity = intensity;
     	shake_decay = 0.015 / (intensity*10);
 	}
    
    function RotateSmoothlyToRotation(targetLocalRotation:Quaternion) {
        if(lerpedAmount == 0)
            startingLocalRotation = transform.localRotation;
        
        lerpedAmount += smoothRotationSpeed;
        
        if(lerpedAmount >= 1) {
            // Unlock Camera
            var mouseLook = gameObject.GetComponent(MouseLook);
            mouseLook.enabled = true;
            rotatingSmoothly = false;
            lerpedAmount = 0;
        }
        else {
            rotatingSmoothly = true;
        }
        
        transform.localRotation = Quaternion.Lerp(startingLocalRotation,targetLocalRotation,lerpedAmount);
        Debug.Log("LROT: " + transform.localRotation);
    }
    
    function RotateAroundForwardAxisToUpwardsRotation() {
        var targetUpDirection = -(Vector3.Cross(storedParent.right,transform.forward).normalized);
        
        if(Vector3.Angle(transform.up,targetUpDirection) <= smoothRotationSpeed) {
            var mouseLook = gameObject.GetComponent(MouseLook);
            rotatingSmoothly = false;
            transform.parent = storedParent;
            transform.rotation = Quaternion.LookRotation(transform.forward,targetUpDirection);
        }
        else {
            transform.RotateAround(transform.position,transform.forward,smoothRotationSpeed*Time.deltaTime);
        }
    }
    
    function StartLandingRotation() {
        rotatingSmoothly = true;
        storedParent = transform.parent;
        transform.parent = null;
       // Debug.LogError("nothing");
    }
}