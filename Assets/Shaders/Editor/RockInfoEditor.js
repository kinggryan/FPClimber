﻿@CustomEditor(RockInfo)
class RockInfoEditor extends Editor {
		// MARK: Editor
	enum DrawMode {Off,Unclimbable,Climbable,Clip,StartZone,EndZone};
	static var startZoneColor = Color.yellow;
	static var endZoneColor = Color.cyan;
	
	// draw mode
	var drawMode = DrawMode.Off;
	var drawRadius:int = 1;
	private var storedTexture: Texture;
	private var textureSize:float = 200;
	private var textureSaveName:String = "MyClimbMap";

	function OnEnable() {
		var rockInfo = target as RockInfo;
			
		if(rockInfo.climbMap == null) {
			ResetTexture();
		}
	}
	
	function ResetTexture() {
		var rockInfo = target as RockInfo;
			
		// Create the texture and initialize to an unclimbable texture
		rockInfo.climbMap = Texture2D(textureSize,textureSize);
		var whiteArray = new Color[textureSize*textureSize];
		for(var c in whiteArray) {
			c = RockInfo.unclimbableColor;
		}
		rockInfo.climbMap.SetPixels(whiteArray);
		rockInfo.climbMap.Apply();
			
		// Set the material property for climb
		rockInfo.renderer.sharedMaterial.SetTexture("_ClimbTex",(rockInfo.climbMap as Texture));
		
		if(RockInfo.showClimbMaps) {
			rockInfo.renderer.material.mainTexture = rockInfo.climbMap;
		}
		
		rockInfo.climbMapSize = textureSize;
	} 
	
	function SaveTexture(fileName: String) {
		// Save the texture to a file
		var rockInfo = target as RockInfo;
        if(AssetDatabase.LoadAssetAtPath("Assets/"+fileName+".tex",Texture) != null)
            AssetDatabase.DeleteAsset("Assets/"+fileName+".tex");
        
		AssetDatabase.CreateAsset(rockInfo.climbMap as Texture,"Assets/"+fileName+".tex");
	}

	function OnSceneGUI() {
		var rockInfo = target as RockInfo;
		if(drawMode != DrawMode.Off && !rockInfo.procedurallyGenerated) {
			// Ignore all selection changes within the scene view
     		HandleUtility.AddDefaultControl(GUIUtility.GetControlID(FocusType.Passive));
	
			var raycastHit: RaycastHit;
			var e : Event = Event.current;
		
			// If we've clicked or dragged and we're clicking on the object
			if((e.type == EventType.MouseDown || e.type == EventType.MouseDrag) && e.button == 0
				&& Physics.Raycast(HandleUtility.GUIPointToWorldRay(e.mousePosition),raycastHit)) {
				// Draw stuff
				var texCoord = raycastHit.textureCoord;
				var drawTexture = rockInfo.climbMap;
				texCoord *= drawTexture.width;
			
				// Draw a circle
				switch(drawMode) {
				case DrawMode.Unclimbable:
					Circle(drawTexture,texCoord.x,texCoord.y,drawRadius,RockInfo.unclimbableColor);
					break;
				case DrawMode.Clip:
					Circle(drawTexture,texCoord.x,texCoord.y,drawRadius,RockInfo.clipColor);
					break;
				case DrawMode.Climbable:
					Circle(drawTexture,texCoord.x,texCoord.y,drawRadius,RockInfo.climbableColor);
					break;
				default: break;
				}
			}
		}
		else if (drawMode != DrawMode.Off){
			// Ignore all selection changes within the scene view
     		HandleUtility.AddDefaultControl(GUIUtility.GetControlID(FocusType.Passive));
	
			var raycastHit2: RaycastHit;
			var e2 : Event = Event.current;
		
			// If we've clicked or dragged and we're clicking on the object
			if((e2.type == EventType.MouseDown || e2.type == EventType.MouseDrag) && e2.button == 0
				&& Physics.Raycast(HandleUtility.GUIPointToWorldRay(e2.mousePosition),raycastHit2)) {
				// Draw stuff
				var texCoord2 = raycastHit2.textureCoord;
				var drawTexture2 = rockInfo.climbMap;
				texCoord2 *= drawTexture2.width;
			
				// Draw a circle
				switch(drawMode) {
				case DrawMode.Unclimbable:
					Circle(drawTexture2,texCoord2.x,texCoord2.y,drawRadius,RockInfo.unclimbableColor);
					break;
				case DrawMode.Clip:
					Circle(drawTexture2,texCoord2.x,texCoord2.y,drawRadius,RockInfo.clipColor);
					break;
				case DrawMode.Climbable:
					Circle(drawTexture2,texCoord2.x,texCoord2.y,drawRadius,RockInfo.climbableColor);
					break;
				case DrawMode.StartZone:
					Circle(drawTexture2,texCoord2.x,texCoord2.y,drawRadius,startZoneColor);
					break;
				case DrawMode.EndZone:
					Circle(drawTexture2,texCoord2.x,texCoord2.y,drawRadius,endZoneColor);
					break;
				default: break;
				}
			}
		}
	}
	
	function OnInspectorGUI() {
		// Layout normal Rock Info Properties
		var rockInfo = target as RockInfo;
		rockInfo.procedurallyGenerated = EditorGUILayout.Toggle("Procedurally Generated",rockInfo.procedurallyGenerated);
	
		if(!rockInfo.procedurallyGenerated) {
			// display draw tools
			var firstDrawMode = drawMode;
			drawMode = EditorGUILayout.EnumPopup("Draw Mode",drawMode);
			drawRadius = EditorGUILayout.IntSlider("Draw Radius",drawRadius,1,40);
		
			// If we changed into a draw mode, show the climb texture
			if(firstDrawMode == DrawMode.Off && firstDrawMode != drawMode) {
				storedTexture = rockInfo.renderer.sharedMaterial.mainTexture;
				rockInfo.renderer.sharedMaterial.mainTexture = rockInfo.climbMap;
			}
			else if (firstDrawMode != DrawMode.Off && drawMode == DrawMode.Off) {
				// reset the texture
				rockInfo.renderer.sharedMaterial.mainTexture = storedTexture;
			}
		
			// Reset texture with larger size
			textureSize = EditorGUILayout.FloatField("Texture Size",textureSize);
		
			if (EditorGUILayout.Toggle("Reset Texture",false)) {
				ResetTexture();
			}
		
			// saving texture
			textureSaveName = EditorGUILayout.TextField(textureSaveName);
		
			if (EditorGUILayout.Toggle("Save Texture As File",false)) {
				SaveTexture(textureSaveName);
			}
		}
		else {
			// display procedural params
			rockInfo.climbMapSize = EditorGUILayout.IntField("Climb Map Size",rockInfo.climbMapSize);
			rockInfo.startingPortionClimbable = EditorGUILayout.FloatField("Starting Rock Cell Portion",rockInfo.startingPortionClimbable);
		    rockInfo.crackCount = EditorGUILayout.IntField("Number of Cracks",rockInfo.crackCount);
        /*	rockInfo.numberOfUnclimbableZones = EditorGUILayout.IntField("Number of Unclimbable Zones",rockInfo.numberOfUnclimbableZones);
			rockInfo.minRadiusOfUnclimbableZone = EditorGUILayout.IntField("Minimum Radius of Unclimbable Zones",rockInfo.minRadiusOfUnclimbableZone);
			rockInfo.maxRadiusOfUnclimbableZone = EditorGUILayout.IntField("Maximum Radius of Unclimbable Zones",rockInfo.maxRadiusOfUnclimbableZone);
			rockInfo.numberOfCracks = EditorGUILayout.IntField("Number of Cracks",rockInfo.numberOfCracks);
			rockInfo.minimumCrackLength = EditorGUILayout.IntField("Min Crack Length",rockInfo.minimumCrackLength);
			rockInfo.maximumCrackLength = EditorGUILayout.IntField("Max Crack Length",rockInfo.maximumCrackLength);
			rockInfo.crackWidth = EditorGUILayout.IntField("Crack Width",rockInfo.crackWidth);
			rockInfo.crackCurviness = EditorGUILayout.FloatField("Crack Curviness",rockInfo.crackCurviness);
			 */
			// Display Draw Mode Tools
			// display draw tools
			var prechangeDrawMode = drawMode;
			drawMode = EditorGUILayout.EnumPopup("Draw Mode",drawMode);
			drawRadius = EditorGUILayout.IntSlider("Draw Radius",drawRadius,1,40);
		
			// If we changed into a draw mode, show the climb texture
			if(prechangeDrawMode == DrawMode.Off && firstDrawMode != drawMode) {
				storedTexture = rockInfo.renderer.sharedMaterial.mainTexture;
				rockInfo.renderer.sharedMaterial.mainTexture = rockInfo.climbMap;
			}
			else if (prechangeDrawMode != DrawMode.Off && drawMode == DrawMode.Off) {
				// reset the texture
				rockInfo.renderer.sharedMaterial.mainTexture = storedTexture;
			}
		
			if (EditorGUILayout.Toggle("Reset Texture",false)) {
				textureSize = rockInfo.climbMapSize;
				ResetTexture();
			}
		}
	}
	
	public function Circle(tex : Texture2D ,cx :  int ,cy: int ,r:int ,col: Color)
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