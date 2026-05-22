export const cosmicVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cosmicFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform float uDepth;
  uniform float uVelocity;
  uniform vec2  uJuliaC;
  uniform float uJuliaZoom;
  uniform float uJuliaBlend;
  uniform float uPaletteOffset;
  uniform float uCoreIntensity;
  uniform float uCloudDensity;
  uniform int   uRaymarchSteps;
  uniform int   uJuliaIters;
  uniform float uReducedMotion;

  vec3 palette(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.55);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318530718 * (c * t + d));
  }

  float hash3(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  float juliaCheap(vec2 uv, vec2 c, int maxIter) {
    vec2 z = uv;
    float n = 0.0;
    for (int i = 0; i < 64; i++) {
      if (i >= maxIter) break;
      if (dot(z, z) > 16.0) break;
      z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
      n += 1.0;
    }
    return n / float(maxIter);
  }

  mat2 rot2(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
  }

  void main() {
    float animTime = uReducedMotion > 0.5 ? 0.0 : uTime;

    vec2 fragUv = (vUv - 0.5);
    fragUv.x *= uResolution.x / uResolution.y;

    vec3 camPos = vec3(0.0, 0.0, 0.0);
    vec3 rayDir = normalize(vec3(fragUv * 1.0, -1.0));

    vec3 col = vec3(0.0);
    float t = 0.5;
    float stepSize = 0.6;

    for (int i = 0; i < 32; i++) {
      if (i >= uRaymarchSteps) break;
      vec3 p = camPos + rayDir * t;

      float twistAngle = p.z * 0.4 + uDepth * 0.3 + animTime * 0.05;
      p.xy = rot2(twistAngle) * p.xy;

      float density = fbm(p * 0.6 + vec3(0.0, 0.0, uDepth * 0.3 + animTime * 0.1));

      float radial = exp(-length(p.xy) * 0.4);
      density *= radial * uCloudDensity;

      vec2 juliaUV = p.xy / max(uJuliaZoom, 1e-3);
      float juliaD = juliaCheap(juliaUV, uJuliaC, uJuliaIters);
      density *= mix(1.0 - uJuliaBlend * 0.4, 1.0 + uJuliaBlend * 0.4, juliaD);

      float paletteT = density * 0.5 + uPaletteOffset
                     + p.z * 0.05 + float(i) * 0.02;
      vec3 sampleCol = palette(paletteT);

      float fade = exp(-t * 0.04);
      col += sampleCol * density * stepSize * fade;

      t += stepSize;
    }

    float coreDist = length(fragUv);
    float core = exp(-coreDist * 8.0) * uCoreIntensity;
    col += vec3(core) * 1.4;
    col += palette(uPaletteOffset + 0.5) * exp(-coreDist * 4.0) * 0.3;

    float velGlow = clamp(abs(uVelocity) * 0.04, 0.0, 0.6);
    col += palette(uPaletteOffset) * velGlow * exp(-coreDist * 3.0);

    col = 1.0 - exp(-col);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Cosmic stream + stars: distance-scaled `gl_PointSize` + sharp radial falloff (no soft sprite texture). */
export const cosmicPointVertex = /* glsl */ `
  attribute vec3 cosmicVertexColor;
  attribute float cosmicPointSize;
  varying vec3 vColor;
  varying float vFog;
  uniform float uFogDensity;
  uniform float uFogDistanceScale;
  uniform float uPixelRatio;
  uniform float uSizeBoost;
  uniform float uSizeClamp;
  uniform float uMinPointPx;

  void main() {
    vColor = cosmicVertexColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float ez = max(0.05, -mvPosition.z);
    // Strong perspective: nearer points read larger; reads more “3D” than uniform sprite quads.
    float ps = uSizeBoost * uPixelRatio * (620.0 / ez) * (1.0 + 0.35 / (1.0 + ez * 0.008));
    float psClamped = clamp(ps, 2.0, uSizeClamp);
    if (uMinPointPx > 0.001) {
      psClamped = max(psClamped, uMinPointPx * uPixelRatio);
    }
    gl_PointSize = psClamped * cosmicPointSize;
    // Distant star shell uses uFogDistanceScale << 1 so exp() fog does not erase the field.
    vFog = exp(-uFogDensity * length(mvPosition.xyz) * uFogDistanceScale);
  }
`;

export const cosmicPointFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vFog;
  uniform float uLuminosity;

  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float r = length(q);
    float solid = 1.0 - smoothstep(0.84, 1.0, r);
    float edge = 1.0 - smoothstep(0.62, 0.94, r);
    float a = edge * solid;
    a = pow(max(a, 0.0), 0.95);
    if (a < 0.02) discard;
    vec3 rgb = vColor * (0.28 + 0.95 * solid) * vFog * uLuminosity;
    gl_FragColor = vec4(rgb * a, a);
  }
`;
