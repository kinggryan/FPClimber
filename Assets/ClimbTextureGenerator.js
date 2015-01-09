#pragma strict

class ClimbTextureGenerator {
	static function GenerateClimbTexture(	textureSize: int, 
											numberOfUnclimbableZones: int,
											minRadiusOfUnclimbableZones: int,
											maxRadiusOfUnclimbableZones: int,
											numberOfCracks: int,
											minimumCrackLength: int,
											maximumCrackLength: int,
											crackWidth: int,
											crackCurviness: float
										) : Texture2D {
		// generate and set to white
		var climbTex = Texture2D(textureSize,textureSize);
		var whiteArray = new Color[textureSize*textureSize];
		for(var c in whiteArray) {
			c = RockInfo.climbableColor;
		}
		climbTex.SetPixels(whiteArray);
		
		// generate a random number of unclimbable zones
		for(var i = 0 ; i < numberOfUnclimbableZones ; i++) {
			var radius : int = Random.RandomRange(minRadiusOfUnclimbableZones,maxRadiusOfUnclimbableZones);
			var x : int = Random.RandomRange(0,textureSize-radius);
			var y : int = Random.RandomRange(0,textureSize-radius);
			
			// draw the circle
			var array = new Color[4*radius * radius];
			var center = Vector2(radius,radius);
			for(var xV = 0 ; xV < radius*2 ; xV++) {
				for(var yV = 0 ; yV < radius*2 ; yV++) {
					if(Vector2.Distance(Vector2(xV,yV),center) < radius) {
						climbTex.SetPixel(x+xV,y+yV,RockInfo.unclimbableColor);
					}
				}
			}
		}
		
		// Generate cracks for clipping into
		GenerateClipCracks(climbTex,numberOfCracks,minimumCrackLength,maximumCrackLength,crackWidth,crackCurviness);				
		
		climbTex.Apply();
		return(climbTex);
	}
	
	static function GenerateClipCracks(texture: Texture2D,numberOfCracks: int, minimumLengthOfCrack: int, maximumLengthOfCrack: int, crackWidth: int,crackCurviness: float) {
		// Generate this number of cracks
		for(var i = 0 ; i < numberOfCracks; i++) {
			Debug.Log("new crack");
			// find crack length and the number of circles we'll need to generate this crack length given the width
			var crackLength : int = Random.RandomRange(minimumLengthOfCrack,maximumLengthOfCrack);
			
			// Here we multiply by two because we want to make sure the crack circles overlap
			var numberOfCrackCircles = crackLength * 2 / crackWidth;
			
			// generate start point for crack
			var radius = crackWidth / 2;
			var x : int = Random.RandomRange(0,texture.width - radius);
			var y : int = Random.RandomRange(0,texture.height - radius);
			var crackDirection = Random.insideUnitCircle.normalized;
			
			// Generate crack circles
			for(var j = 0 ; j < numberOfCrackCircles ; j++) {
				// draw the circle
				var array = new Color[4*radius * radius];
				var center = Vector2(radius,radius);
				for(var xV = 0 ; xV < radius*2 ; xV++) {
					for(var yV = 0 ; yV < radius*2 ; yV++) {
						if(Vector2.Distance(Vector2(xV,yV),center) < radius) {
							texture.SetPixel(x+xV,y+yV,RockInfo.clipColor);
						}
					}
				}
				
				// Make sure to move the crack in a valid direction
				do {
					// modify the crack direction based on crack curviness
					var degrees = Random.Range(-crackCurviness*180,crackCurviness*180);
					crackDirection = Quaternion.Euler(0, 0, degrees) * crackDirection;
					crackDirection.Normalize();
				
					// choose the new crack point
					x += crackDirection.x * radius;
					y += crackDirection.y * radius;
				} while(false); //while (x >= texture.width - radius || y >= texture.height - radius || x < 0 || y < 0);
			}
		}
	}
}