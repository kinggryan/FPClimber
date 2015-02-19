#pragma strict

class GrapplingHookEquipment extends MonoBehaviour {
    // Properties
    private var tether: Tether;
    public var grapplingHookProjectile: GrapplingHookProjectile;
    
    // Methods
    function ThrowHook() {
        var projectile = GameObject.Instantiate(grapplingHookProjectile,transform.position + Vector3.up,Quaternion.identity);
        projectile.rigidbody.AddForce(10*transform.forward);
        projectile.rigidbody.AddForce(10*transform.up);
        (projectile.GetComponent(GrapplingHookProjectile) as GrapplingHookProjectile).tether = tether;
    }
    
    function Start() {
        tether = GetComponent(Tether) as Tether;
    }
}