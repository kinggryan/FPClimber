#pragma strict

class ToolDisplay extends MonoBehaviour {
    var buttonGUITexture: GUITexture;
    var iconGUITexture: GUITexture;
    
    var inactiveButtonTex: Texture;
    var activeButtonTex: Texture;
    
    var handTex: Texture;
    var ropeTex: Texture;
    var hookTex: Texture;
    
    private var activeToolList: boolean[] = [false,false,false];
    private var currentTool: ClimberTool = ClimberTool.Hand;
    
    function Activate() {
        buttonGUITexture.texture = activeButtonTex;
        switch(currentTool) {
        case ClimberTool.Hand : 
            activeToolList[0] = true; break;
        case ClimberTool.Rope : 
            activeToolList[1] = true; break;
        case ClimberTool.Hook :
            activeToolList[1] = true;
            activeToolList[2] = true;
            break;
        }
    }
    
    function Deactivate() {
        buttonGUITexture.texture = inactiveButtonTex;
        switch(currentTool) {
        case ClimberTool.Hand : 
            activeToolList[0] = false; break;
        case ClimberTool.Rope : 
            activeToolList[1] = false;
            activeToolList[2] = false; break;
        case ClimberTool.Hook :
            activeToolList[2] = false; break;
        }
    }
    
    function Deactivate(tool:ClimberTool) {
        switch(tool) {
        case ClimberTool.Hand : 
            activeToolList[0] = false; break;
        case ClimberTool.Rope : 
            activeToolList[1] = false;
            activeToolList[2] = false; break;
        case ClimberTool.Hook:
            activeToolList[1] = false;
            activeToolList[2] = false; break;
        }
        
        if(tool == currentTool)
            Deactivate();
    }
    
    function ChangeTool(tool:ClimberTool) {
        currentTool = tool;
        
        switch(tool) {
        case ClimberTool.Hand : 
            iconGUITexture.texture = handTex; 
            if(activeToolList[0])
                Activate();
            else
                Deactivate();
            break;
        case ClimberTool.Rope : 
            iconGUITexture.texture = ropeTex;
            if(activeToolList[1])
                Activate();
            else
                Deactivate();
            break;
        case ClimberTool.Hook :
            iconGUITexture.texture = hookTex;
            if(activeToolList[2])
                Activate();
            else
                Deactivate();
        }
    }
}