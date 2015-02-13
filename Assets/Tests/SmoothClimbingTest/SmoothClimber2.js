#pragma strict

class SmoothClimber2 extends MonoBehaviour {
    // Properties
    private var contactPoint: Vector3;
    private var contactDirection: Vector3;
    private var climbSpeed = 4;
    private var targetContactDistance = 1.2;
    private var controller: CharacterController;
    
    private var rotationPivotDepth = 0.1;
    
    // Methods
    function GetExpectedHorizontalMovement() : Vector3 {
        var expectedMovement = Vector3(Input.GetAxis("Horizontal"), 0, 0);
        expectedMovement = transform.rotation * expectedMovement;
        expectedMovement = expectedMovement * climbSpeed * Time.deltaTime;
        return expectedMovement;
    }
    
    function GetExpectedVerticalMovement() : Vector3 {
        var expectedMovement = Vector3(0, Input.GetAxis("Vertical"), 0);
        expectedMovement = transform.rotation * expectedMovement;
        expectedMovement = expectedMovement * climbSpeed * Time.deltaTime;
        return expectedMovement;
    }
    
    function SetContactDistance() {
        var raycastHit: RaycastHit;
        if(Physics.Raycast(transform.position,transform.forward,raycastHit)) {
            // Set position, contact Point, and contact Direction to be correct
            contactPoint = raycastHit.point;
            contactDirection = raycastHit.normal;
            transform.position = contactPoint + (contactDirection * targetContactDistance);
            transform.rotation = Quaternion.LookRotation(-contactDirection,Vector3.up);
        }
        else {
            Debug.LogError("failed to hit");
        }
    }
    
    function MoveLinearly(movement: Vector3,hitInfo: RaycastHit) {
        // Move self. Move the contact point exactly as you moved yourself.
        var startPosition = transform.position;
        controller.Move(movement);
      //  var actualMovement = transform.position - startPosition;
//        contactPoint += actualMovement;
        contactPoint = hitInfo.point;
        
        // move ourselves the exact distance away from the wall that we should be
        var correctionalMovement = (contactPoint + (contactDirection * targetContactDistance)) - transform.position;
        controller.Move(correctionalMovement);
        
        // If we found a different normal, make sure to change our contact direction
        if(hitInfo.normal != contactDirection && !(Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),movement.normalized) < 1 || Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),-movement.normalized) < 1)) {
            Debug.Log("Cross: " +Vector3.Cross(hitInfo.normal,contactDirection));
            Debug.Log("Angle : " + Vector3.Angle(Vector3.Cross(hitInfo.normal,contactDirection),movement.normalized));
            var tempContactDirection = Vector3.Slerp(contactDirection,hitInfo.normal.normalized,3*Time.deltaTime);
            var rotation = Quaternion.FromToRotation(contactDirection,tempContactDirection);
            contactDirection = tempContactDirection;
            var newUp = rotation * transform.up;
            
            // calculate new up vector
            transform.rotation = Quaternion.LookRotation(-contactDirection,newUp);
        } 
        else {
            Debug.Log("Workin");
        }
    }
    
    function MoveSpherically(movement: Vector3,rotationAxis:Vector3) {
        // Calculate where we should ideally rotate towards
        var pivotPoint = contactPoint + (rotationPivotDepth * (contactPoint - transform.position).normalized);
        var angleToRotate = movement.magnitude * 360 / (2 * Mathf.PI * Vector3.Distance(pivotPoint,transform.position));
        var angleSign = 1.0;
        if(Vector3.Angle(Vector3.Cross(rotationAxis,transform.forward),movement) < 90) {
            angleSign = -1.0;
        }
        var targetContactDirection = Quaternion.AngleAxis(angleSign*angleToRotate,rotationAxis) * contactDirection;
        var targetEndPosition = pivotPoint + (targetContactDirection * Vector3.Distance(pivotPoint,transform.position));
        var rotationalMovement = targetEndPosition - transform.position;
        
        // Move yourself
        var startPosition = transform.position;
        controller.Move(rotationalMovement);
        var actualMovement = transform.position - startPosition;
        
        // If the actual movement was different from the rotational movement, we need to do some fixes.
        if(rotationalMovement != actualMovement) {
            // TODO: Calculate what the actual new contact direction should be
        }
        else {
            contactDirection = targetContactDirection;
            transform.rotation = Quaternion.LookRotation(-contactDirection,transform.up);
        }
    }
    
    function Move() {
        MoveHorizontally();
        MoveVertically();
    }
    
    function MoveHorizontally() {
        var expectedHorizontalMovement = GetExpectedHorizontalMovement();
        var raycastHit: RaycastHit;
        var checkDistance = Vector3.Distance(transform.position,contactPoint) + rotationPivotDepth;
        if(expectedHorizontalMovement != Vector3.zero) {
            // Perform a raycast to see if we've found rock
            if(Physics.Raycast(transform.position + expectedHorizontalMovement,-contactDirection,raycastHit,checkDistance) &&
            (raycastHit.normal == contactDirection || Vector3.Angle(raycastHit.normal,expectedHorizontalMovement) >= 90)) {
                MoveLinearly(expectedHorizontalMovement,raycastHit);
            }
            else {
                MoveSpherically(expectedHorizontalMovement,transform.up);
            }
        }
    }
    
    function MoveVertically() {
        var expectedMovement = GetExpectedVerticalMovement();
        var raycastHit: RaycastHit;
        var checkDistance = Vector3.Distance(transform.position,contactPoint) + rotationPivotDepth;
        if(expectedMovement != Vector3.zero) {
            // Perform a raycast to see if we've found rock
            if(Physics.Raycast(transform.position + expectedMovement,-contactDirection,raycastHit,checkDistance) &&
            (raycastHit.normal == contactDirection || Vector3.Angle(raycastHit.normal,expectedMovement) >= 90)) {
                MoveLinearly(expectedMovement,raycastHit);
            }
            else {
                MoveSpherically(expectedMovement,transform.right);
            }
        }
    }
    
    function Start() {
        controller = GetComponent(CharacterController) as CharacterController;
        SetContactDistance();
    }
    
    function Update() {
        Move();
    }
}