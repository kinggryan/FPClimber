#pragma strict

class ToolDisplay extends MonoBehaviour {
    var buttonGUITexture: GUITexture;
    var iconGUITexture: GUITexture;
    
    var inactiveButtonTex: Texture;
    var activeButtonTex: Texture;
    
    var handTex: Texture;
    
    function Activate() {
        buttonGUITexture.texture = activeButtonTex;
    }
    
    function Deactivate() {
        buttonGUITexture.texture = inactiveButtonTex;
    }
}