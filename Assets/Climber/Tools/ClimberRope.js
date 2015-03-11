#pragma strict

class ClimberRope extends MonoBehaviour {
    // Properties
    var rope: UltimateRope;
    var m_fRopeExtension:float;
    var ropeExtensionSpeed = 5.0;
    private var cc: CharacterController;
    
    // Methods
    function Start() {
         m_fRopeExtension = rope != null ? rope.m_fCurrentExtension : 0.0f;
    }
    
    function Update() {
        if(Input.GetKey(KeyCode.O)) m_fRopeExtension += Time.deltaTime * ropeExtensionSpeed;
        if(Input.GetKey(KeyCode.I)) m_fRopeExtension -= Time.deltaTime * ropeExtensionSpeed;
        
        m_fRopeExtension = Mathf.Clamp(m_fRopeExtension, 0.0f, rope.ExtensibleLength);
   //     rope.ExtendRope(UltimateRope.ERopeExtensionMode.LinearExtensionIncrement, m_fRopeExtension - rope.m_fCurrentExtension);
       
    
        // Auto extend rope
    }
    
    function AutoExtendRope(expectedMovement:Vector3) : Vector3 {
        // Extends and retracts the rope automatically and, if the rope cannot extend, returns the modified movement
        var startPosition = transform.position;
        var endPosition = transform.position + expectedMovement;
	//	cc.Move(tetherDirection.normalized * (distance-playerToContactTargetDistance));
        var distanceChange = Vector3.Distance(endPosition,startPosition) + 0.02;
        m_fRopeExtension += distanceChange;
  //      rope.ExtendRope(UltimateRope.ERopeExtensionMode.LinearExtensionIncrement, m_fRopeExtension - rope.m_fCurrentExtension);
    }
}