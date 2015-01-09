Shader "Example/Normal Extrusion" {
    Properties {
      _MainTex ("Main Texture", 2D) = "white" {}
      _ClimbTex ("Climb Texture",2D) = "white" {}
      _Amount ("Extrusion Amount", Range(-1,1)) = 0.5
      _ColorTint ("Tint", Color) = (1.0, 0.6, 0.6, 1.0)
      _White ("White", Color) = (1.0, 1.0, 1.0, 1.0)
    }
    SubShader {
      Tags { "RenderType" = "Opaque" }
      CGPROGRAM
      #pragma surface surf Lambert
      struct Input {
          float2 uv_MainTex;
          float2 uv_ClimbTex;
          float3 tintColor;
          float3 worldPos;
          float3 worldNormal;
      };
      float _Amount;
      fixed4 _ColorTint;
      fixed4 _White;
      sampler2D _MainTex;
      sampler2D _ClimbTex;
      void surf (Input IN, inout SurfaceOutput o) {
          o.Albedo = tex2D (_MainTex, IN.uv_MainTex).rgb;
          float tintDistance = 5.0;
          float dist = distance(IN.worldPos,_WorldSpaceCameraPos);
          dist = clamp(dist,0.0,tintDistance);
          fixed4 colorTint = tex2D (_ClimbTex, IN.uv_ClimbTex);
          fixed3 up = (0.0,1.0,0.0);
          o.Albedo *= colorTint*(tintDistance-dist)/tintDistance + _White*(1.0-(tintDistance-dist)/tintDistance);
      }
      ENDCG
    } 
    Fallback "Diffuse"
  }