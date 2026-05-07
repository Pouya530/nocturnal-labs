/**
 * Warp-tunnel Julia — polar remap + DE, with:
 * - Three-tap octave crossfade (fract(tpx - o)) so log-radius rings align without tears.
 * - Cymatics escape + interior coloring + grain (juliaFractalFrag-style “texture”).
 */
export const juliaTunnelFrag = /* glsl */ `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform float uDepth;
uniform vec2  uCenter;
uniform float uDiscRadius;
uniform float uHoleRadius;
uniform float uPaletteOffset;
uniform float uSpiralPhase;
uniform float uZoomRate;
uniform float uMaxIter;
uniform float uReducedMotion;
uniform float uColorIntensity;

#define MAX_ITERS 256
const float B = 256.0;

vec3 palette(float t) {
  float hue = t * 3.0 + uPaletteOffset;
  float r = 0.5 + 0.5 * cos(6.28318 * hue);
  float g = 0.5 + 0.5 * cos(6.28318 * (hue + 0.33));
  float b = 0.5 + 0.5 * cos(6.28318 * (hue + 0.67));
  vec3 base = vec3(r, g, b);
  float sat = 0.5 + uColorIntensity * 0.5;
  return mix(vec3(0.5), base, sat);
}

float juliaAngleCont(float zx, float zy) {
  float rh = length(vec2(zx, zy));
  if (rh < 1e-7) return 0.0;
  return 2.0 * atan(zy, zx + rh + 1e-7);
}

vec4 juliaDEZ(vec2 z, vec2 c) {
  float dz = 1.0;
  float m2 = dot(z, z);
  float n = 0.0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (float(i) >= uMaxIter) break;
    if (m2 > B * B) break;
    dz = 2.0 * length(z) * dz;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    n += 1.0;
  }
  float dist = 0.5 * sqrt(m2) * log(m2) / max(dz, 1e-20);
  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;
  return vec4(dist, sn, z.x, z.y);
}

// Smooth escape n + orbit z at escape (same loop structure as juliaFractalFrag).
vec3 juliaEscapeNZ(vec2 z0, vec2 c) {
  float n = -1.0;
  vec2 z = z0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (float(i) >= uMaxIter) break;
    float x2 = z.x * z.x;
    float y2 = z.y * z.y;
    if (x2 + y2 > 4.0) {
      float log_zn = log(x2 + y2) * 0.5;
      float nu = log(log_zn / log(2.0)) / log(2.0);
      n = float(i) + 1.0 - nu;
      break;
    }
    z = vec2(x2 - y2 + c.x, 2.0 * z.x * z.y + c.y);
  }
  return vec3(n, z.x, z.y);
}

vec3 tunnelSlice(float o, float kk, vec2 p, float r, float tpY, float tpxCont) {
  float scale = exp2(-kk);
  vec2 cJul = uCenter + uDiscRadius * vec2(
    cos(uDepth * 0.31 + o),
    sin(uDepth * 0.27 + o * 1.7)
  );

  float ang = tpY + uSpiralPhase * 0.15 * sin(tpxCont * 1.7);
  vec2 z0 = scale * vec2(ang * 1.5, kk * 2.0 - 1.0);

  vec4 dez = juliaDEZ(z0, cJul);
  float resx = dez.x;
  float resy = dez.y;

  vec3 esc = juliaEscapeNZ(z0, cJul);
  float nEsc = esc.x;
  vec2 zOrbit = esc.yz;

  float aa = max(1e-6, scale * 0.014);
  float edge = 1.0 - smoothstep(0.0, aa, resx);

  float denom = max(uMaxIter, 1.0);
  vec3 col;
  float spiralAcc = 0.0;

  if (nEsc >= 0.0) {
    float tLin = clamp(nEsc / denom, 0.0, 1.0);
    float zx0 = z0.x;
    float zy0 = z0.y;
    float r0 = length(vec2(zx0, zy0));
    float a0 = juliaAngleCont(zx0, zy0);
    float lr0 = log(r0 + 1e-6);

    float spr0 = lr0 * 0.48 + uSpiralPhase * 0.26 + uPaletteOffset * 0.07;
    spr0 += 0.036 * sin(2.0 * a0 + lr0 * 1.15 + uSpiralPhase * 0.85);
    spr0 += 0.024 * sin(4.0 * a0 + uPaletteOffset * 2.1 + lr0 * 0.65);

    float zr2 = zOrbit.x * zOrbit.x + zOrbit.y * zOrbit.y;
    float zang = juliaAngleCont(zOrbit.x, zOrbit.y);
    float zlr = log(zr2) * 0.5;

    float sprEsc = zlr * 0.13;
    sprEsc += 0.030 * sin(2.0 * zang + zlr * 0.9 + uSpiralPhase * 0.5);
    sprEsc += 0.020 * cos(4.0 * zang + zlr * 0.45 + uPaletteOffset * 1.3);

    float sprSum = spr0 + sprEsc + tLin * 0.1 + fract(o * 0.173) * 0.35;
    spiralAcc = fract(sprSum);
    float t = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98);
    col = palette(t);

    float nearEdge = (1.0 - tLin) * (1.0 - tLin);
    col *= 1.0 + 0.22 * nearEdge;
    col = mix(col, col * 1.07, tLin * 0.2);

    float grain = 0.5 + 0.5 * sin(zx0 * 14.0 + zy0 * 11.0 + zlr * 3.2 + uPaletteOffset);
    col += vec3(0.012, 0.014, 0.022) * grain;
  } else {
    float ang = juliaAngleCont(zOrbit.x, zOrbit.y);
    float rm = length(zOrbit);
    float lf = log(max(rm, 5e-7));
    float zx0 = z0.x;
    float zy0 = z0.y;

    float sub = 0.5 + 0.5 * sin(ang * 1.55 + lf * 1.25 + uPaletteOffset * 0.22);
    vec3 deep = vec3(0.018, 0.026, 0.072);
    vec3 lift = vec3(0.065, 0.056, 0.15);
    col = mix(deep, lift, sub);

    float grain = 0.5 + 0.5 * sin(zx0 * 9.0 + zy0 * 7.5 + lf * 2.8);
    col += vec3(0.015, 0.02, 0.038) * grain;

    float rI = length(vec2(zx0, zy0));
    float aI = juliaAngleCont(zx0, zy0);
    float lrI = log(rI + 1e-6);
    float spIFull = lrI * 0.5 + uSpiralPhase * 0.25 + lf * 0.055;
    spIFull += 0.038 * sin(2.0 * aI + lrI * 1.05 + uSpiralPhase * 0.7);
    spIFull += 0.026 * sin(4.0 * ang + lf * 0.9 + uPaletteOffset * 1.4);
    float sprI = fract(spIFull);
    vec3 sArm = palette(0.1 + sprI * 0.62);
    sArm *= vec3(0.26, 0.28, 0.4);
    col = mix(col, sArm, 0.44 * (0.55 + 0.45 * sub));
    col = clamp(col, 0.0, 1.0);
    spiralAcc = sprI;
  }

  float tLin2 = clamp(resy / denom, 0.0, 1.0);
  float ins = smoothstep(aa * 4.0, 0.0, resx);
  vec3 deep2 = vec3(0.018, 0.026, 0.072);
  vec3 lift2 = vec3(0.065, 0.056, 0.15);
  float a0i = juliaAngleCont(z0.x, z0.y);
  float lr0i = log(length(z0) + 1e-6);
  float sub2 = 0.5 + 0.5 * sin(a0i * 1.55 + lr0i * 1.25 + uPaletteOffset * 0.22);
  vec3 innerBase = mix(deep2, lift2, sub2);
  float aIp = juliaAngleCont(p.x, p.y);
  float lrIp = log(r + 1e-6);
  float spIFull2 = lrIp * 0.5 + uSpiralPhase * 0.25 + lr0i * 0.055;
  spIFull2 += 0.038 * sin(2.0 * aIp + lrIp * 1.05 + uSpiralPhase * 0.7);
  float sprI2 = fract(spIFull2);
  vec3 sArm2 = palette(0.1 + sprI2 * 0.62);
  sArm2 *= vec3(0.28, 0.30, 0.45);
  vec3 inner = mix(innerBase, sArm2, 0.5 * (0.55 + 0.45 * sub2));
  col = mix(col, inner, ins * 0.38);

  col *= edge;
  float rimT = fract(tLin2 * 0.37 + resy * 0.031 + spiralAcc * 0.21 + 0.31);
  col += 0.52 * pow(edge, 4.0) * palette(rimT);

  return col;
}

void main() {
  vec2 uv;
  uv.x = (gl_FragCoord.x + 0.5) / uResolution.x;
  uv.y = 1.0 - (gl_FragCoord.y + 0.5) / uResolution.y;
  vec2 v_coord = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = v_coord * aspect;

  float r = max(length(p), 1e-4);
  float a = juliaAngleCont(p.x, p.y);
  float tpY = a * (1.0 / 3.14159265);

  float tpx = 0.6 / r + uDepth * uZoomRate;
  float o0 = floor(tpx);
  float kk0 = fract(tpx - o0);

  vec3 c0 = tunnelSlice(o0, kk0, p, r, tpY, tpx);
  vec3 col = c0;
  if (kk0 < 0.18) {
    float kkLo = fract(tpx - (o0 - 1.0));
    vec3 cLo = tunnelSlice(o0 - 1.0, kkLo, p, r, tpY, tpx);
    col = mix(cLo, c0, smoothstep(0.0, 0.18, kk0));
  } else if (kk0 > 0.82) {
    float kkHi = fract(tpx - (o0 + 1.0));
    vec3 cHi = tunnelSlice(o0 + 1.0, kkHi, p, r, tpY, tpx);
    col = mix(c0, cHi, smoothstep(0.82, 1.0, kk0));
  }

  float fog = 1.0 - exp(-tpx * 0.055);
  float hole = smoothstep(uHoleRadius * 0.68, uHoleRadius, r);
  col *= fog * hole;
  col = 1.0 - exp(-col * 1.02);

  if (uReducedMotion > 0.5) {
    col *= 0.92;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
