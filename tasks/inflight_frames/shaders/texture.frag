#version 430
#extension GL_GOOGLE_include_directive : require


#include "cpp_glsl_compat.h"



layout(location = 0) out vec4 fragColor;

layout(push_constant) uniform pushed_params {
  uvec2 resolution;
} pushed_params_t;

float hash( float x )
{
    return fract( sin( x ) * 43758.5453 );
}

float noise( vec2 uv )  // Thanks Inigo Quilez
{
    vec3 x = vec3( uv.xy, 0.0 );
    
    vec3 p = floor( x );
    vec3 f = fract( x );
    
    f = f*f*(3.0 - 2.0*f);
    
    float offset = 57.0;
    
    float n = dot( p, vec3(1.0, offset, offset*2.0) );
    
    return mix(	mix(	mix( hash( n + 0.0 ), 		hash( n + 1.0 ), f.x ),
        				mix( hash( n + offset), 	hash( n + offset+1.0), f.x ), f.y ),
				mix(	mix( hash( n + offset*2.0), hash( n + offset*2.0+1.0), f.x),
                    	mix( hash( n + offset*3.0), hash( n + offset*3.0+1.0), f.x), f.y), f.z);
}

float snoise( vec2 uv )
{
    return noise( uv ) * 2.0 - 1.0;
}

void main()
{
  vec2 uv = gl_FragCoord.xy / pushed_params_t.resolution;
  float height = snoise(uv * 75.0); // Пример с шумом
  vec3 picture = vec3(0.0, 0.0, 1.0);
  fragColor = vec4(picture * (1.-height), 1.0);
}