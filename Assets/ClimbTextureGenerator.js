#pragma strict

class ClimbTextureGenerator {
	static function GenerateClimbMapCellularAutomata(textureSize: int) : Texture2D {
		var percentRockCells = 0.36;
		var numSteps = 8;
		var neighborhoodThreshRock = 0;//1/8; //0.5;//5/9;
		var neighborhoodSquare = 1;
		
		// Start with a random map
		// generate and set to white
		var climbTex = Texture2D(textureSize,textureSize);
		var whiteArray = new Color[textureSize*textureSize];
		for(var c in whiteArray) {
			if(Random.value < percentRockCells) {
				c = RockInfo.climbableColor;
			}
			else {
				c = RockInfo.unclimbableColor;
			}
		}
		
		// Do a number of time steps
		for(var timeStep = 0 ; timeStep < numSteps ; timeStep++) {
			// create a blank array that will replace the current one
			var tempColorArray = new Color[textureSize*textureSize];
			
			// Iterate on entire array
			for(var index = 0 ; index < textureSize*textureSize ; index++) {
				var rockNeighborCount = 0;
				
				//get neighbors of this space
				for(var neighbordIndex in GetNeighborhoodIndices(index,neighborhoodSquare,textureSize)) {
					// mod them by the array size so they don't overlap edges
					neighbordIndex = neighbordIndex % ( whiteArray.Length );
					
					// increment if rock
					if(neighbordIndex > 0 && neighbordIndex < whiteArray.Length) {
						if(whiteArray[neighbordIndex] == RockInfo.climbableColor) {
							rockNeighborCount++;
						}
					}
					else {
						rockNeighborCount++;
					}
				}
				
				// set ourselves based on threshold percent
				if(rockNeighborCount <= 3) {
					tempColorArray[index] = RockInfo.unclimbableColor;
				}	
				else {
					tempColorArray[index] = RockInfo.climbableColor;
				}
			}
			
			// now replace the array
			whiteArray = tempColorArray;
		}
		
		// Set the pixels
		climbTex.SetPixels(whiteArray);
		climbTex.Apply();
		
		return(climbTex);
	}
	
	static function GetNeighborhoodIndices(index: int, neighborhoodDistance: int,width: int) : int[] {
		var returnArray: int[] = new int[(neighborhoodDistance+2)*(neighborhoodDistance+2) - 1];
		
		var currentIndex = 0;
		
		for(var distance = 1 ; distance <= neighborhoodDistance ; distance++) {
			returnArray[currentIndex++] = index - distance ;
			returnArray[currentIndex++] = index + distance;
			
			for(var subdistance = 0 ; subdistance <= distance ; subdistance++) {
				returnArray[currentIndex++] = index + (width*distance) + subdistance;
				if(subdistance > 0)
					returnArray[currentIndex++] = index + (width*distance) - subdistance;
				
				returnArray[currentIndex++] = index - (width*distance) + subdistance;
				if(subdistance > 0)
					returnArray[currentIndex++] = index - (width*distance) - subdistance;
			}
		}
		
//		for(var v in returnArray) {
//			Debug.Log(v);
//		}
		
		return returnArray;
	}

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
			var radius : int = Random.Range(minRadiusOfUnclimbableZones,maxRadiusOfUnclimbableZones);
			var x : int = Random.Range(0,textureSize-radius);
			var y : int = Random.Range(0,textureSize-radius);
			
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
			// find crack length and the number of circles we'll need to generate this crack length given the width
			var crackLength : int = Random.Range(minimumLengthOfCrack,maximumLengthOfCrack);
			
			// Here we multiply by two because we want to make sure the crack circles overlap
			var numberOfCrackCircles = crackLength * 2 / crackWidth;
			
			// generate start point for crack
			var radius = crackWidth / 2;
			var x : int = Random.Range(0,texture.width - radius);
			var y : int = Random.Range(0,texture.height - radius);
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
			//	do {
					// modify the crack direction based on crack curviness
					var degrees = Random.Range(-crackCurviness*180,crackCurviness*180);
					crackDirection = Quaternion.Euler(0, 0, degrees) * crackDirection;
					crackDirection.Normalize();
				
					// choose the new crack point
					x += crackDirection.x * radius;
					y += crackDirection.y * radius;
			//	} while(false); //while (x >= texture.width - radius || y >= texture.height - radius || x < 0 || y < 0);
			}
		}
	}
	
	// Utility Drawers
	private function Circle(tex : Texture2D ,cx :  int ,cy: int ,r:int ,col: Color)
     {
         var x : int;
         var y : int;
         var px : int;
         var nx : int;
         var py : int;
         var ny : int;
         var d: int;
         
         for (x = 0; x <= r; x++)
         {
             d = Mathf.Ceil(Mathf.Sqrt(r * r - x * x));
             for (y = 0; y <= d; y++)
             {
                 px = cx + x;
                 nx = cx - x;
                 py = cy + y;
                 ny = cy - y;
 
                 tex.SetPixel(px, py, col);
                 tex.SetPixel(nx, py, col);
  
                 tex.SetPixel(px, ny, col);
                 tex.SetPixel(nx, ny, col);
 
             }
         } 
         
         tex.Apply();   
     }
}