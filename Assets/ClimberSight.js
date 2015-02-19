#pragma strict

class ClimberSight extends MonoBehaviour {
    // Properties
    public var sun: Light;
    private var inShadowModifier = 1.5;
    private var inShadow = false;
    
    // Methods
    function Update() {
        if(!inShadow && Physics.Linecast(transform.position,sun.transform.position)) {
            EnterShadow();
        }
        else if (inShadow && !Physics.Linecast(transform.position,sun.transform.position)) {
            EnterLight();
        }
    }
    
    function EnterShadow() {
        
    }
    
    function EnterLight() {
        
    }
}
