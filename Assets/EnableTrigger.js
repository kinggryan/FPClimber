#pragma strict

class EnableTrigger extends MonoBehaviour {
    public var component: MonoBehaviour;
    
    function OnTriggerEnter(collider: Collider) {
        if(collider.GetComponent(ClimberController) != null) {
            component.enabled = true;
        }
    }
    
    function OnTriggerExit(collider:Collider) {
        if(collider.GetComponent(ClimberController) != null) {
            component.enabled = false;
        }
    }
}