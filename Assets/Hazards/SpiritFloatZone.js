#pragma strict

var floatTime = 3.0;

function OnTriggerEnter(collider:Collider) {
    var c = collider.GetComponent(ClimberController) as ClimberController;
    if(c != null)
        c.StartFloating(floatTime);
}