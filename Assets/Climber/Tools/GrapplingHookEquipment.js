#pragma strict

class GrapplingHookEquipment extends MonoBehaviour {
    // Properties
    private var tether: Tether;
    public var grapplingHookProjectile: GrapplingHookProjectile;
    private var climber: ClimberController;
    private var cameraTransform: Transform;
    
    // Charge Properties
    private var maximumChargeTime: float = 1.2;
    private var maximumForce: float = 12;
    private var minimumForce: float = 2;
    private var currentCharge:float = 0;
    
    // Methods
    function ThrowHook() {
        var force = (currentCharge * (maximumForce-minimumForce)) + minimumForce;
        
        var projectile = GameObject.Instantiate(grapplingHookProjectile,transform.position + Vector3.up,Quaternion.identity);
        projectile.rigidbody.AddForce(force*cameraTransform.forward,ForceMode.Impulse);
        projectile.rigidbody.AddForce(force/2*transform.up,ForceMode.Impulse);
        (projectile.GetComponent(GrapplingHookProjectile) as GrapplingHookProjectile).tether = tether;
        tether.AttachToHook(projectile);
    }
    
    function Start() {
        tether = GetComponent(Tether) as Tether;
        climber = GetComponent(ClimberController) as ClimberController;
        cameraTransform = (GetComponentInChildren(Camera)).transform;
    }
    
    function Update() {
        if(Input.GetMouseButton(0) && !tether.tethered && climber.tool == ClimberTool.Hook) {
            currentCharge = Mathf.Min(currentCharge + (Time.deltaTime/maximumChargeTime),1);
        }
        else if (Input.GetMouseButtonUp(0) && !tether.tethered && climber.tool == ClimberTool.Hook) {
            ThrowHook();
            currentCharge = 0;
        }
    }
}