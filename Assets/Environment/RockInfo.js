#pragma strict

class RockInfo extends MonoBehaviour {
	// Properties
	public var climbMap: Texture2D;
	public static var showClimbMaps: boolean = false;
	static var clipColor = Color.green;
	static var climbableColor = Color.blue + 0.5*Color.white;
	static var unclimbableColor = Color.white;
	
	// Editor
	var procedurallyGenerated: boolean = false;
	
	// Procedural params
	var climbMapSize: int = 200;
	var startingPortionClimbable:float = 0.34;
    var crackCount: int = 50;
/*	var numberOfUnclimbableZones = 30;
	var minRadiusOfUnclimbableZone = 40;
	var maxRadiusOfUnclimbableZone = 150;
	var numberOfCracks = 50;
	var minimumCrackLength = 50;
	var maximumCrackLength = 950;
	var crackWidth = 35;
	var crackCurviness = 0.1; */
	
	// Methods
	function Start() {
		if (procedurallyGenerated) {
			//climbMap = ClimbTextureGenerator.GenerateClimbTexture(	climbMapSize,
			//													numberOfUnclimbableZones,minRadiusOfUnclimbableZone,minRadiusOfUnclimbableZone,
			//													numberOfCracks,minimumCrackLength,maximumCrackLength,crackWidth,crackCurviness);
			var textureSet = ClimbTextureGenerator.GenerateClimbMapCellularAutomata(climbMapSize,climbMap,startingPortionClimbable,crackCount);
			climbMap = textureSet.climbMap;
		//	renderer.material.SetTexture("_FeatureTex",textureSet.featureTex);
		}
		
		// Set the material property for climb
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

