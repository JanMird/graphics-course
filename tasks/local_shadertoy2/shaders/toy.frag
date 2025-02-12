#version 430

layout(location = 0) out vec4 fragColor;

layout(binding = 0) uniform sampler2D emp;
layout(binding = 1) uniform sampler2D iChannel0;
layout(push_constant) uniform pushed_params 

{
  uint resolution_x;
  uint resolution_y;
  float time;
  float mouse_x;
  float mouse_y;
} pushed_params_t;

float iTime;
vec2 iResolution;
vec2 iMouse;

const int MAX_MARCHING_STEPS = 255;
const float MIN_DIST = 0.0;
const float MAX_DIST = 8.0;
const float PRECISION = 1e-3;
const float LH = -2.0 - PRECISION;
const float RH = 2.0 + PRECISION;
const float LD = -2.0 - PRECISION;
const float RD = 6.0 + PRECISION;
const float LV = -1.0 - PRECISION;
const float RV = 3.0 + PRECISION;
const float RAD = 1.0;
const vec3 SPHERE_CENTER = vec3(0.0, 1.0, -1.0);


float shadowAmount(vec3 lightPos, vec3 surfPos) {
    vec3 lightDir = surfPos - lightPos;
    vec3 radDir = SPHERE_CENTER - lightPos;
    float angleCos = dot(normalize(lightDir), normalize(radDir));
    float doubleAngleCos = 2.0 * pow(angleCos, 2.0) - 1.0;
    float len = sqrt(pow((SPHERE_CENTER.x - lightPos.x), 2.0) + pow((SPHERE_CENTER.y - lightPos.y), 2.0) + pow((SPHERE_CENTER.z - lightPos.z), 2.0));
    float difference = (2.0 * pow(len, 2.0) - 2.0 * pow(len, 2.0) * doubleAngleCos) / 2.0;
    if (difference < RAD) {
        if (angleCos < 0.0) {
            return 1.5;
        }
        return 0.3;
    }
    return 1.0;
}

bool isInRoom(vec3 pos) {
    return pos.x > LH && pos.x < RH && pos.z > LD && pos.z < RD && pos.y > LV && pos.y < RV;
}

vec4 rayPlaneIntersection(float plane, vec3 ro, vec3 rd, vec3 lightPos, vec3 N, vec3 col, float xdiv, sampler2D tex) {
    if (plane > 0.0) {
        vec3 pos = ro + rd * plane;
        if (isInRoom(pos)) {
            float shadow = shadowAmount(lightPos, pos);
            vec3 L = normalize(lightPos - pos);
            float diffuse = max(0.0, dot(N, L));
            
            if (xdiv == 1.0) {
                return vec4(col * diffuse * shadow, 1.0);
            }
            
            vec3 planePoint = vec3(0., 0., 0.);
            vec3 tangent = normalize(cross(N, vec3(0.0, 1.0, 0.0))); 
            vec3 bitangent = cross(N, tangent); 
            vec3 projectedPos = pos - planePoint;
            vec2 uv = vec2(dot(projectedPos, tangent), dot(projectedPos, bitangent));
            uv.y /= 5.9;
            uv.x /= xdiv;
            uv += 0.5;
            uv = clamp(uv, vec2(0.0), vec2(1.0));
          
            vec4 heightMap = texture(tex, uv);
            
            return vec4(heightMap.rgb * diffuse * shadow, 1.0);
        }
    }
    return vec4(0.0);
}

float sdSphere(vec3 p) {
  return length(p - SPHERE_CENTER) - RAD;
}

float rayMarch(vec3 ro, vec3 rd, float start, float end) {
  float depth = start;

  for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
    vec3 p = ro + depth * rd;
    float d = sdSphere(p);
    depth += d;
    if (d < PRECISION || depth > end) break;
  }

  return depth;
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * PRECISION;
    return normalize(
      e.xyy * sdSphere(p + e.xyy) +
      e.yyx * sdSphere(p + e.yyx) +
      e.yxy * sdSphere(p + e.yxy) +
      e.xxx * sdSphere(p + e.xxx));
}


vec3 tex3D(sampler2D tex, vec3 p, vec3 n)
{
    vec3 blending = abs(n);
    blending = normalize(max(blending, PRECISION));
    float b = (blending.x + blending.y + blending.z);
    blending /= b;
    
    vec4 xaxis = texture(tex, p.yz);
    vec4 yaxis = texture(tex, p.xz);
    vec4 zaxis = texture(tex, p.xy);
    
    return (xaxis * blending.x + yaxis * blending.y + zaxis * blending.z).rgb;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord/iResolution.xy;
    vec2 mouse = iMouse.xy / iResolution.xy;
    if (iMouse.xy == vec2(0, 0)) {
        mouse = vec2(0.3, 0.5);
    }
    float yaw = (mouse.x * 2.0 - 1.0) * 3.14159;
    float pitch = (mouse.y - 0.5) * 3.14159;

    // Camera rotation
    vec3 forward = vec3(cos(yaw) * cos(pitch), sin(pitch), sin(yaw) * cos(pitch));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    // Ray origin
    vec3 ro = vec3(0.0, 1.5, 3.0);

    // Ray direction
    vec3 rd = normalize(forward + (uv.x - 0.5) * right * (iResolution.x/iResolution.y) + (uv.y - 0.5) * up);

    // Light position
    vec3 lightPos = vec3(1.5, 1.8, 0.8);
    
    // Distance to sphere
    float d = rayMarch(ro, rd, MIN_DIST, MAX_DIST);
    
    vec3 col = vec3(0);
    if (d > MAX_DIST) {
        col = vec3(0.0, 0.0, 0.0);
    } else {
        vec3 p = ro + rd * d;
        vec3 normal = calcNormal(p);
        vec3 lightDirection = normalize(lightPos - p);
        float dif = clamp(dot(normal, lightDirection), 0.3, 1.);
        col = dif * tex3D(emp, p, normal);
    }

    if (col != vec3(0.0, 0.0, 0.0)) {
        fragColor = vec4(col, 1.0);
        return;
    }
    // add geometry texture

/*    
    // Floor
    fragColor = rayPlaneIntersection(-ro.y / rd.y, ro, rd, lightPos, vec3(0.0, 1.0, 0.0), vec3(0.5, 0.3, 0.1), 1.0, iChannel0);
    if (fragColor.a > 0.0) return;
*/
    // Ceiling
    fragColor = rayPlaneIntersection((3.0 - ro.y) / rd.y, ro, rd, lightPos, vec3(0.0, -1.0, 0.0), vec3(0.8, 0.8, 0.8), 2.0, emp);
    if (fragColor.a > 0.0) return; 

    // Wall 1 (Green)
    fragColor = rayPlaneIntersection((-2.0 - ro.x) / rd.x, ro, rd, lightPos, vec3(1.0, 0.0, 0.0), vec3(0.2, 0.5, 0.2), 12.0, iChannel0);
    if (fragColor.a > 0.0) return;
    
    // Wall 2 (Blue)
    fragColor = rayPlaneIntersection((2.0 - ro.x) / rd.x, ro, rd, lightPos, vec3(-1.0, 0.0, 0.0), vec3(0.2, 0.2, 0.5), 12.0, iChannel0);
    if (fragColor.a > 0.0) return;

    // Wall 3 (Red)
    fragColor = rayPlaneIntersection((-2.0 - ro.z) / rd.z, ro, rd, lightPos, vec3(0.0, 0.0, 1.0), vec3(0.5, 0.2, 0.2), 4.0, iChannel0);
    if (fragColor.a > 0.0) return;
    
    // Wall 3 (Yellow)
    fragColor = rayPlaneIntersection((6.0 - ro.z) / rd.z, ro, rd, lightPos, vec3(0.0, 0.0, -1.0), vec3(0.5, 0.5, 0.2), 4.0, iChannel0);
    if (fragColor.a > 0.0) return;

    fragColor = vec4(0, 0, 0.7, 0.5);
}

void main( )
{
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);

  iResolution = vec2(pushed_params_t.resolution_x, pushed_params_t.resolution_y);
  iTime = pushed_params_t.time;
  iMouse = vec2(pushed_params_t.mouse_x, pushed_params_t.mouse_y);

  mainImage(fragColor, fragCoord);
}