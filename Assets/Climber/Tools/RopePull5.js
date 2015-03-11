#pragma strict

class RopePull5 extends MonoBehaviour {
    var ropeLinks:GameObject[];
    var ropeStart:GameObject;
    var maximumRopeLength:float;
    var rope:UltimateRope;
    var ropeAttachmentPoint:GameObject;
    
    function Start() {
        ropeLinks = new GameObject[ropeStart.transform.childCount];
        for(var i = 0 ; i < ropeStart.transform.childCount ; i++) {
            ropeLinks[i] = ropeStart.transform.GetChild(i).gameObject;
        }
    }
    
    function PullPlayer(expectedMovement:Vector3) : Vector3 {
        maximumRopeLength = 12; //(rope.m_fCurrentExtension*0.5) + 10.2;
        // count total distance of rope Links
        var prevLink = ropeLinks[0];
        var currDist:float = 0;
        var firstContactLink = ropeLinks[0];
        var foundFirstContactLink = false;
        for(var l in ropeLinks) {
            currDist += Vector3.Distance(prevLink.transform.position,l.transform.position);
            prevLink = l;
            firstContactLink = l;
            // check to see if there's an unbroken line from the previous link to this link
    /*        if(Physics.Raycast(prevLink.transform.position,l.transform.position)) {
                currDist += Vector3.Distance(prevLink.transform.position,l.transform.position);
                prevLink = l;
                foundFirstContactLink = true;
            }
            var finalLink = l;
            
            // if we haven't hit anything, pull in the direction of l
            if(!foundFirstContactLink) {
                firstContactLink = l;
            }
      */  }
    //    currDist += Vector3.Distance(finalLink.transform.position,prevLink.transform.position);
        Debug.Log("Dist: " +currDist);
    //    currDist += Vector3.Distance(transform.position+expectedMovement,prevLink.transform.position);
        
        currDist = Vector3.Distance(ropeAttachmentPoint.transform.position,transform.position);
        
        
        if(currDist > maximumRopeLength) {
            // move player towards this place
            var cc = GetComponent(CharacterController) as CharacterController;
            var movementDir = (ropeAttachmentPoint.transform.position - transform.position).normalized;
            var movementDist = currDist - maximumRopeLength; //Mathf.Min(c,0.1);
       //     Debug.Log("PULLING "+movementDist);
           Debug.Log("fcl: " +firstContactLink);
            
            var startPos = transform.position;
            cc.Move(movementDir*movementDist);
            var postMovePos = transform.position;
            Debug.Log("New v : "+((expectedMovement+(postMovePos-startPos))/Time.deltaTime));
            return(expectedMovement+((postMovePos-startPos)*0.95/Time.deltaTime));
        }
    
        return(expectedMovement);
    }
}