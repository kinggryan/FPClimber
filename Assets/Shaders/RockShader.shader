Shader "Outlined/RockShader" {
	Properties {
		_Color ("Main Color", Color) = (.5,.5,.5,1)
        _TopColor ("Top Color", Color) = (.5,.5,.5,1)
		_OutlineColor ("Outline Color", Color) = (0,0,0,1)
		_Outline ("Outline width", Range (.002, 0.03)) = .005
		_MainTex ("Base (RGB)", 2D) = "white" { }
        _ClimbTex ("Climb Texture",2D) = "white" {}
        _FeatureTex ("Feature Texture",2D) = "white" {}
        _White ("White", Color) = (1.0, 1.0, 1.0, 1.0)
        _BottomColor ("Bottom Color",Color) = (.5,.5,.5,1)
        _MaxHeight ("Maximum Gradient Height", Float) = 100.0
	}
 
CGINCLUDE
#include "UnityCG.cginc"
 
struct appdata {
	float4 vertex : POSITION;
	float3 normal : NORMAL;
};
 
struct v2f {
	float4 pos : POSITION;
	float4 color : COLOR;
};
 
uniform float _Outline;
uniform float4 _OutlineColor;
 
v2f vert(appdata v) {
	// just make a copy of incoming vertex data but scaled according to normal direction
	v2f o;
	o.pos = mul(UNITY_MATRIX_MVP, v.vertex);
 
	float3 norm   = mul ((float3x3)UNITY_MATRIX_IT_MV, v.normal);
	float2 offset = TransformViewToProjection(norm.xy);
 
	o.pos.xy += offset * o.pos.z * _Outline;
	o.color = _OutlineColor;
	return o;
}
ENDCG
 
	SubShader {
		//Tags {"Queue" = "Geometry+100" }
CGPROGRAM
#pragma surface surf Lambert
struct Input {
    float2 uv_MainTex;
    float2 uv_ClimbTex;
    float2 uv_FeatureTex;
    float3 tintColor;
    float3 worldPos;
    float3 worldNormal;
};
float _Amount;
fixed4 _ColorTint;
fixed4 _White;
fixed4 _TopColor;
fixed4 _BottomColor;
float _MaxHeight;
sampler2D _MainTex;
sampler2D _ClimbTex;
sampler2D _FeatureTex;
void surf (Input IN, inout SurfaceOutput o) {
  //  o.Albedo = tex2D (_MainTex, IN.uv_MainTex).rgb;
    float height = IN.worldPos.y / _MaxHeight;
    height = clamp(height,0,1);
    fixed4 c = tex2D(_MainTex, IN.uv_MainTex) * ((height * _TopColor) + ((1-height) * _BottomColor));
    o.Albedo = c;
//   o.Albedo += tex2D
    
    float tintDistance = 500.0;
    float dist = distance(IN.worldPos,_WorldSpaceCameraPos);
    dist = clamp(dist,0.0,tintDistance);
    fixed4 colorTint = tex2D (_ClimbTex, IN.uv_ClimbTex);
    o.Albedo *= ((1 - (1 - colorTint.r) * tex2D (_FeatureTex, IN.uv_FeatureTex).a) * _White) + ((1 - colorTint.r) * tex2D (_FeatureTex, IN.uv_FeatureTex).a * tex2D (_FeatureTex, IN.uv_FeatureTex).rgb);
    fixed3 up = (0.0,1.0,0.0);
   // o.Albedo *= colorTint*(tintDistance-dist)/tintDistance + _White*(1.0-(tintDistance-dist)/tintDistance);
}
ENDCG
 
		// note that a vertex shader is specified here but its using the one above
		Pass {
			Name "OUTLINE"
			Tags { "LightMode" = "Always" }
			Cull Front
			ZWrite On
			ColorMask RGB
			Blend SrcAlpha OneMinusSrcAlpha
			//Offset 50,50
 
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag
			half4 frag(v2f i) :COLOR { return i.color; }
			ENDCG
		}
	}
 
	SubShader {
CGPROGRAM
#pragma surface surf Lambert
struct Input {
    float2 uv_MainTex;
    float2 uv_ClimbTex;
    float2 uv_FeatureTex;
    float3 tintColor;
    float3 worldPos;
    float3 worldNormal;
};
float _Amount;
fixed4 _ColorTint;
fixed4 _White;
fixed4 _TopColor;
fixed4 _BottomColor;
float _MaxHeight;
sampler2D _MainTex;
sampler2D _ClimbTex;
sampler2D _FeatureTex;
void surf (Input IN, inout SurfaceOutput o) {
  //  o.Albedo = tex2D (_MainTex, IN.uv_MainTex).rgb;
    float height = IN.worldPos.y / _MaxHeight;
    height = clamp(height,0,1);
	fixed4 c = tex2D(_MainTex, IN.uv_MainTex) * ((height * _TopColor) + ((1-height) * _BottomColor));
    o.Albedo = c;
 //   o.Albedo += tex2D (_FeatureTex, IN.uv_FeatureTex).rgb;
    float tintDistance = 500.0;
    float dist = distance(IN.worldPos,_WorldSpaceCameraPos);
    dist = clamp(dist,0.0,tintDistance);
    fixed4 colorTint = tex2D (_ClimbTex, IN.uv_ClimbTex);
    fixed3 up = (0.0,1.0,0.0);
    o.Albedo *= colorTint*(tintDistance-dist)/tintDistance + _White*(1.0-(tintDistance-dist)/tintDistance);
}
ENDCG
 
		Pass {
			Name "OUTLINE"
			Tags { "LightMode" = "Always" }
			Cull Front
			ZWrite On
			ColorMask RGB
			Blend SrcAlpha OneMinusSrcAlpha
 
			CGPROGRAM
			#pragma vertex vert
			#pragma exclude_renderers gles xbox360 ps3
			ENDCG
			SetTexture [_MainTex] { combine primary }
		}
	}
 
	Fallback "Diffuse"
}