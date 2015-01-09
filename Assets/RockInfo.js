#pragma strict

class RockInfo extends MonoBehaviour {
	// Properties
	var climbMap: Texture2D;
	private var showClimbMaps: boolean = false;
	static var clipColor = Color.green;
	static var climbableColor = Color.blue;
	static var unclimbableColor = Color.white;
	
	// Methods
	function Start() {
		climbMap = ClimbTextureGenerator.GenerateClimbTexture(	1024,
																30,40,150,
																5,50,950,35,0.1);
		renderer.material.SetTexture("_ClimbTex",(climbMap as Texture));
		
		if(showClimbMaps) {
			renderer.material.mainTexture = climbMap;
		}
	}
	
	function IsPointClimbable(uvPoint: Vector2) : boolean {
		// check if the texture point on the climb map is nonblack		
		if (climbMap.GetPixel(uvPoint.x * climbMap.width,uvPoint.y * climbMap.height) != unclimbableColor) {
			return true;
		}
		
		return false;
	}	
	
	function IsPointClipable(uvPoint: Vector2) : boolean {
		// check if the texture point on the climb map is nonblack		
		if (climbMap.GetPixel(uvPoint.x * climbMap.width,uvPoint.y * climbMap.height) == clipColor) {
			return true;
		}
		
		return false;
	}
	
	function CreateDiagonalClimbableTexture() {
		climbMap = Texture2D(512,512);
		
		for(var  i = 0 ; i < 512 ; i++ ) {
			for (var j = 0 ; j < 512 ; j++) {
				if (i > j)
					climbMap.SetPixel(i,j,clipColor);
				else
					climbMap.SetPixel(i,j,Color.black);
			}
		}
		
		climbMap.Apply();
	}
}