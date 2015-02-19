#pragma strict

class ClimbTextureSet extends System.ValueType {
	var climbMap:Texture;
	var featureTex:Texture;
}

class ClimbTextureGenerator {
	static function GenerateClimbMapCellularAutomata(textureSize: int,infoTexture: Texture2D,percentRockCells:float,numberOfCracks:int) : ClimbTextureSet {
		var percentCrackCells = 0.11;
		var numSteps = 8;
		var neighborhoodThreshRock = 3;//1/8; //0.5;//5/9;
		var neighborhoodSquare = 1;
		
		// Start with a random map
		// generate and set to white
		var climbTex = Texture2D(textureSize,textureSize);
		var whiteArray = new Color[textureSize*textureSize];
		var drawTex = Texture2D(textureSize,textureSize);
		for(var c in whiteArray) {
			var randomNumber = Random.value;
			if(randomNumber < percentRockCells) {
				c = RockInfo.climbableColor;
			}
			else {
				c = RockInfo.unclimbableColor;
			}
		}
		var clearArray = new Color[textureSize*textureSize];
		for(var c in clearArray) {
			c = Color.clear;
		}
		drawTex.SetPixels(clearArray);
		
		
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
				if (rockNeighborCount > neighborhoodThreshRock) {
					tempColorArray[index] = RockInfo.climbableColor;
				}
				else {
					tempColorArray[index] = RockInfo.unclimbableColor;
				}
			}
			
			// now replace the array
			whiteArray = tempColorArray;
		}
		
		// Set the pixels
		climbTex.SetPixels(whiteArray);
		
		// Generate Cracks
		GenerateClipCracks(climbTex,drawTex,numberOfCracks, 8, 15, 3, 0.1);
		
		// Guarantee a path
//		EnsureClimbabilityWithinDistance(whiteArray,infoTexture.GetPixels(),textureSize,8);
		
//		climbTex.SetPixels(whiteArray);
		
		climbTex.Apply();
		drawTex.Apply();
		
		var texSet = ClimbTextureSet();
		texSet.climbMap = climbTex as Texture;
		texSet.featureTex = drawTex as Texture;
		return(texSet);
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
		//GenerateClipCracks(climbTex,numberOfCracks,minimumCrackLength,maximumCrackLength,crackWidth,crackCurviness);				
		
		climbTex.Apply();
		return(climbTex);
	}
	
	static function GenerateClipCracks(texture: Texture2D,drawTexture: Texture2D, numberOfCracks: int, minimumLengthOfCrack: int, maximumLengthOfCrack: int, crackWidth: int,crackCurviness: float) {
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
							
							// Draw this pixel as black for the drawn texture
							var drawTextureX = (x+xV)*drawTexture.width/texture.width;
							var drawTextureY = (y+yV)*drawTexture.height/texture.height;
		
							drawTexture.SetPixel(drawTextureX,drawTextureY,Color.gray);
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
	 
	 // Utility Methods
	 static private function EnsureClimbabilityWithinDistance(climbMap:Color[],climbInfo:Color[],climbMapWidth:int,maximumUnclimbableDistance:int) {
		 /** This method uses the following algorithm:
		  ** -Generate an array of ints of size equal to the color[]. 
		  ** -For each entry in the climbmap that is climbable(or clipable) set the value on the distance matrix to 0. All others initialize to -1
		  ** -At each step, each entry in the array with a value of -1 should set it's value to (1 + the lowest positive value among neighbors). If a tile is next to all -1s, they remain -1
		  ** -once all values are non-negative, we've found the shortest path between every unclimbable spot and its nearest climbable spot
		  ** -Now, for each value greater than the maximumUnclimbableDistance, turn that space into a climbable space.
		  ** Algorithm Complete
		  **/
		 
		 // first, find all unclimbable indices.
	/*	 var indicesToUpdate = Queue();
		 var distanceArray = new int[climbMapWidth*climbMapWidth];
		 
		 for(var index = 0 ; index < climbMapWidth*climbMapWidth ; index++) {
			 if (climbMap[index] == RockInfo.unclimbableColor || climbInfo[index] != RockInfoEditor.startZoneColor) {
				 distanceArray[index] = Mathf.Infinity;
			 }
			 else {
				 distanceArray[index] = 0;
				 // Add this indexes neighbors
				 var neighbors = GetNeighbors(index,climbMapWidth,climbMapWidth);
				 for(n in neighbors) {
					 if(!indicesToUpdate.Contains(n))
					 	indicesToUpdate.Enqueue(n);
				 }
			 }
		 }
		 
		 // Pop off the queue until there's nothing left in the queue
		 while(indicesToUpdate.Count > 0) {
			 // find the minimum distance of neighbors
			 var popIndex = indicesToUpdate.Dequeue();
			 
			 // if we found an end zone, we've already succeeded! So return the same climb map, since it has a path
			 if(climbInfo[popIndex] == RockInfoEditor.endZoneColor) {
				 Debug.Log("PATH FOUND");
				 return(climbMap);
			 }
			 
			 // find the minimum distance among neighbors
			 var tempMin = distanceArray[popIndex];
			 var tempNeighbors = GetNeighbors(popIndex,climbMapWidth,climbMapWidth);
			 for(var neighbor in tempNeighbors) {
				 if(distanceArray[neighbor] + 1 < tempMin) {
				 	// Update tempMin
					 tempMin = distanceArray[neighbor] + 1;
				 }
			 }
			 
			 // Check to see that this distance is <= the maximumReachableDistance. If it's not, then we don't want to update anything
			 if(tempMin <= maximumUnclimbableDistance) {
			 	// update and add neighbors to the queue
			 	if(tempMin < distanceArray[popIndex]) {
				 	// if this is climbable AND within the max reachable distance, set the distance to 0
					if(climbMap[popIndex] != RockInfo.unclimbableColor) {
					 	distanceArray[popIndex] = 0;
					}
					else {
					 	// if not climbable, update the distance
					 	distanceArray[popIndex] = tempMin;
					}
				
					// add neighbors to the update queue
					for(var updateN in tempNeighbors) {
					 	if(!indicesToUpdate.Contains(updateN))
						 	indicesToUpdate.Enqueue(updateN);
					}
			 	 }
		 	 }
		 }
		 
		 // if we popped everything and didn't find a path, do some modifications
		 // TODO: these modifications
		 Debug.Log("PATH NOT FOUND");
		 return(climbMap); */
	 }
	 
	 static private function GetNeighbors(index:int,width:int,height:int) : int[] {
	 	// Only return valid neighbors
		 var tempList = ArrayList();
		 
		 if(index + 1 % (width*height) != 0 && index + 1 < width*height) {
			 tempList.Add(index+1);
		 }
		 if(index % (width*height) != 0) {
			 tempList.Add(index-1);
		 }
		 if(index + width < width*height) {
			 tempList.Add(index+width);
		 }
		 if(index - width >= 0) {
			 tempList.Add(index-width);
		 }
		 
		 var returnArray = new int[tempList.Count];
		 for(var i = 0 ; i < tempList.Count ; i++) {
			 returnArray[i] = tempList[i];
		 }
		 
		 return returnArray;
	 }
}