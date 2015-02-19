Shader "Custom/MyShader" {
	Properties {
		_MainTex ("Base (RGB)", 2D) = "white" {}
        _OutlineThickness ("Outline Thickness", Range(0,1)) = 0.0
        _LitOutlineThickness ("Lit Outline Thickness", Range(0,1)) = 0.1
        _UnlitOutlineThickness ("Unlit Outline Thickness", Range(0,1)) = 0.4
	}
	SubShader {
		Tags { "RenderType"="Opaque" }
		LOD 200
		
		CGPROGRAM
		#pragma surface surf Lambert

		sampler2D _MainTex;

		struct Input {
			float2 uv_MainTex;
            float3 worldPos;
            float3 worldNormal;
		};

        float _OutlineThickness;
        float _UnlitOutlineThickness;
        float _LitOutlineThickness;
		void surf (Input IN, inout SurfaceOutput o) {
			half4 c = tex2D (_MainTex, IN.uv_MainTex);
            float3 cameraToPointAngle = normalize(_WorldSpaceCameraPos - IN.worldPos);
            float3 lightDirection;
            if (0.0 == _WorldSpaceLightPos0.w) // directional light?
            {
                lightDirection = normalize(_WorldSpaceLightPos0.xyz);
            } 
            else // point or spot light
            {
                float3 vertexToLightSource = _WorldSpaceLightPos0.xyz - IN.worldPos;
                float distance = length(vertexToLightSource);
                lightDirection = normalize(vertexToLightSource);
            }
            
            if (dot(cameraToPointAngle, IN.worldNormal) 
                           < lerp(_UnlitOutlineThickness, _LitOutlineThickness, 
                           max(0.0, dot(IN.worldNormal, lightDirection))))
            {
                o.Albedo = (0.0,0.0,0.0);
                o.Alpha = 1.0; 
            }
            else
            
         /*   if(abs(dot(IN.worldNormal,cameraToPointAngle)) < _OutlineThickness) {
                o.Albedo = (0.0, 0.0, 0.0);
                o.Alpha = 1.0;
                } */
          //  else {
            {
                o.Albedo = c.rgb;
			    o.Alpha = c.a;
            }
		}
		ENDCG
	} 
	FallBack "Diffuse"
}
