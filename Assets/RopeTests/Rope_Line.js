/*==========================
==  Physics Based Rope    ==
==  File: Rope.js         ==
==  By: Jacob Fletcher    ==
==  Use and alter Freely  ==
============================
How To Use:
 ( BASIC )
 1. Simply add this script to the object you want a rope teathered to
 2. In the "LineRenderer" that is added, assign a material and adjust the width settings to your likeing
 3. Assign the other end of the rope as the "Target" object in this script
 4. Play and enjoy!
 
 ( Advanced )
 1. Do as instructed above
 2. If you want more control over the rigidbody on the ropes end go ahead and manually
    add the rigidbody component to the target end of the rope and adjust acordingly.
 3. adjust settings as necessary in both the rigidbody and rope script
 
 (About Character Joints)
 Sometimes your rope needs to be very limp and by that I mean NO SPRINGY EFFECT.
 In order to do this, you must loosen it up using the swingAxis and twist limits.
 For example, On my joints in my drawing app, I set the swingAxis to (0,0,1) sense
 the only axis I want to swing is the Z axis (facing the camera) and the other settings to around -100 or 100.
\*/
 
var target : Transform;
var resolution = 0.5;                       //  Sets the amount of joints there are in the rope (1 = 1 joint for every 1 unit)
var ropeDrag = 0.1;                         //  Sets each joints Drag
var ropeMass = 0.1;                     //  Sets each joints Mass
var ropeColRadius = 0.5;               //  Sets the radius of the collider in the SphereCollider component
//var ropeBreakForce = 25.0;                //-------------- TODO (Hopefully will break the rope in half...
private var segmentPos : Vector3[];         //  DONT MESS!   This is for the Line Renderer's Reference and to set up the positions of the gameObjects
private var joints : GameObject[];         //  DONT MESS!   This is the actual joint objects that will be automatically created
private var line;                     //  DONT MESS!    The line renderer variable is set up when its assigned as a new component
private var segments = 0;               //  DONT MESS!   The number of segments is calculated based off of your distance * resolution
private var rope = false;                   //  DONT MESS!   This is to keep errors out of your debug window! Keeps the rope from rendering when it doesnt exist...
 
//Joint Settings
var swingAxis = Vector3(1,1,1);             //  Sets which axis the character joint will swing on (1 axis is best for 2D, 2-3 axis is best for 3D (Default= 3 axis))
var lowTwistLimit = -100.0;               //  The lower limit around the primary axis of the character joint. 
var highTwistLimit = 100.0;               //  The upper limit around the primary axis of the character joint.
var swing1Limit  = 20.0;               //   The limit around the primary axis of the character joint starting at the initialization point.
 
 
// Require a Rigidbody and LineRenderer object for easier assembly
@script RequireComponent(Rigidbody,LineRenderer)
 
function Awake()
{
   BuildRope();
}
 
function Update()
{
   // Put rope control here!
 
 
   /* Destroy Rope Test   (Example of how you can use the rope dynamically)
   if(rope && Input.GetKeyDown("d"))
   {
      DestroyRope();   
   }   
   if(!rope && Input.GetKeyDown("r"))
   {
      BuildRope();
   }
   */
}
function LateUpdate()
{
   // Does rope exist? If so, update its position
   if(rope) {
      for(i=0;i<segments;i++) {
         if(i == 0) {
            line.SetPosition(i,transform.position);
         } else
         if(i == segments-1) {
            line.SetPosition(i,target.transform.position);   
         } else {
            line.SetPosition(i,joints[i].transform.position);
         }
      }
      line.enabled = true;
   } else {
      line.enabled = false;   
   }
}
 
 
 
function BuildRope()
{
   line = gameObject.GetComponent("LineRenderer");
 
   // Find the amount of segments based on the distance and resolution
   // Example: [resolution of 1.0 = 1 joint per unit of distance]
   segments = Vector3.Distance(transform.position,target.position)*resolution;
   line.SetVertexCount(segments);
   segmentPos = new Vector3[segments];
   joints = new GameObject[segments];
   segmentPos[0] = transform.position;
   segmentPos[segments-1] = target.position;
 
   // Find the distance between each segment
   var segs = segments-1;
   var seperation = ((target.position - transform.position)/segs);
 
   for(s=1;s < segments;s++)
   {
      // Find the each segments position using the slope from above
      vector = (seperation*s) + transform.position;   
      segmentPos[s] = vector;
 
      //Add Physics to the segments
      AddJointPhysics(s);
   }
 
   // Attach the joints to the target object and parent it to this object   
   var end = target.gameObject.AddComponent("CharacterJoint");
   end.connectedBody = joints[joints.length-1].transform.rigidbody;
   end.swingAxis = swingAxis;
   end.lowTwistLimit.limit = lowTwistLimit;
   end.highTwistLimit.limit = highTwistLimit;
   end.swing1Limit.limit  = swing1Limit;
   target.parent = transform;
 
   // Rope = true, The rope now exists in the scene!
   rope = true;
}
 
function AddJointPhysics(n)
{
   joints[n] = new GameObject("Joint_" + n);
   joints[n].transform.parent = transform;
   var rigid = joints[n].AddComponent("Rigidbody");
   var col = joints[n].AddComponent("SphereCollider");
   var ph = joints[n].AddComponent("CharacterJoint");
   ph.swingAxis = swingAxis;
   ph.lowTwistLimit.limit = lowTwistLimit;
   ph.highTwistLimit.limit = highTwistLimit;
   ph.swing1Limit.limit  = swing1Limit;
   //ph.breakForce = ropeBreakForce; <--------------- TODO
 
   joints[n].transform.position = segmentPos[n];
 
   rigid.drag = ropeDrag;
   rigid.mass = ropeMass;
   col.radius = ropeColRadius;
 
   if(n==1){      
      ph.connectedBody = transform.rigidbody;
   } else
   {
      ph.connectedBody = joints[n-1].rigidbody;   
   }
 
}
 
function DestroyRope()
{
   // Stop Rendering Rope then Destroy all of its components
   rope = false;
   for(dj=0;dj<joints.length;dj++)
   {
      Destroy(joints[dj]);   
   }
 
   segmentPos = new Vector3[0];
   joints = new GameObject[0];
   segments = 0;
}
 
/* TODO
function OnJointBreak()
{
   print(joints);
}
*/