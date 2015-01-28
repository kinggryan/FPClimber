#pragma strict

class ClimberCameraEffects extends MonoBehaviour {
	// Properties
	var originPosition:Vector3;
 
 	var shake_decay: float;
 	var shake_intensity: float;;
 
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
 	}
 
 	function Shake(intensity: float){
     	originPosition = transform.localPosition;
     	shake_intensity = intensity;
     	shake_decay = 0.015 / (intensity*10);
 	}
}