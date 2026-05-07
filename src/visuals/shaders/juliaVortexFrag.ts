/**
 * Cymatics Julia + **radius-locked vortex twist** on the complex plane before iteration.
 * Localhost experimental mode — see `julia_vortex_plan.md`.
 */
export const juliaVortexFrag = /* glsl */ `
precision highp float;

uniform vec2 uResolution;
uniform vec2 uC;
uniform float uZoom;
uniform float uMaxIter;
uniform float uPaletteOffset;
uniform float uColorIntensity;
uniform float uSpiralPhase;
uniform float uViewAngle;
uniform float uBarrelK;
uniform float uFractalMode;
uniform float uVortexAmp;
uniform float uVortexTime;
uniform float uVortexInnerTimeScale;
/** 0 = default tight swirl; 1 = broad arms / lower spatial freq (wormhole2 “merged” vortex). */
uniform float uVortexWide;
/** 0–1: widen / merge scroll-driven spiral bands into a tunnel-like rib pattern. */
uniform float uVortexTunnel;
/** 0 = opaque; 1 = luminance-based alpha (wormhole2 overlay). */
uniform float uTransparentTunnel;

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

void main() {
  vec2 uv;
  uv.x = (gl_FragCoord.x + 0.5) / uResolution.x;
  uv.y = 1.0 - (gl_FragCoord.y + 0.5) / uResolution.y;
  vec2 v_coord = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  float rad = max(length(v_coord), 1e-4);
  v_coord *= 1.0 + uBarrelK * (rad * rad);

  float scale = pow(2.0, uZoom);
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (v_coord * aspect) / scale;

  float cr = cos(uViewAngle);
  float sr = sin(uViewAngle);
  vec2 pr = vec2(p.x * cr + p.y * sr, -p.x * sr + p.y * cr);

  float rm = length(pr);
  float ar = juliaAngleCont(pr.x, pr.y);
  float wide = clamp(uVortexWide, 0.0, 1.0);
  float kRm = mix(1.0, 0.34, wide);
  // Widen inner↔outer blend so arms read as one continuous swirl.
  float innerToOuter = smoothstep(mix(0.42, 0.06, wide), mix(1.08, 1.42, wide), rm);
  float tVortex = mix(uVortexTime * uVortexInnerTimeScale, uVortexTime, innerToOuter);
  float twist =
    uVortexAmp * rm * rm * sin(tVortex * 0.38 + rm * (11.0 * kRm) + uSpiralPhase * 0.5);
  twist += mix(0.24, 0.4, wide) * uVortexAmp * rm * sin(tVortex * 0.22 + ar * mix(2.0, 1.25, wide) + 1.9);
  twist += mix(0.11, 0.2, wide) * uVortexAmp * sin(tVortex * 0.51 + rm * (19.0 * kRm) + uPaletteOffset * 2.0);
  float cv = cos(twist);
  float sv = sin(twist);
  vec2 prV = vec2(pr.x * cv - pr.y * sv, pr.x * sv + pr.y * cv);

  vec2 complexCoord = prV;
  vec2 z = (uFractalMode > 0.5) ? vec2(0.0) : complexCoord;
  vec2 c = (uFractalMode > 0.5) ? complexCoord : uC;

  float n = -1.0;
  for (int i = 0; i < 256; i++) {
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

  float denom = max(uMaxIter, 1.0);
  vec3 outRgb;

  if (n >= 0.0) {
    float tLin = clamp(n / denom, 0.0, 1.0);
    float zx0 = complexCoord.x;
    float zy0 = complexCoord.y;
    float r0 = length(vec2(zx0, zy0));
    float a0 = juliaAngleCont(zx0, zy0);
    float lr0 = log(r0 + 1e-6);

    float tun = clamp(uVortexTunnel, 0.0, 1.0);
    float spr0 = lr0 * 0.48 + uSpiralPhase * mix(0.26, 0.36, tun) + uPaletteOffset * 0.07;
    spr0 += 0.036 * sin(2.0 * a0 + lr0 * mix(1.15, 0.36, tun) + uSpiralPhase * mix(0.85, 0.48, tun));
    spr0 += 0.024 * sin(4.0 * a0 + uPaletteOffset * 2.1 + lr0 * mix(0.65, 0.2, tun));
    spr0 += 0.062 * tun * sin(1.55 * a0 + lr0 * 0.44 + uSpiralPhase * 1.08);

    float zr2 = z.x * z.x + z.y * z.y;
    float zang = juliaAngleCont(z.x, z.y);
    float zlr = log(zr2) * 0.5;

    float sprEsc = zlr * 0.13;
    sprEsc += 0.030 * sin(2.0 * zang + zlr * mix(0.9, 0.34, tun) + uSpiralPhase * 0.5);
    sprEsc += 0.020 * cos(4.0 * zang + zlr * mix(0.45, 0.2, tun) + uPaletteOffset * 1.3);

    float sprSum = spr0 + sprEsc + tLin * 0.1;
    float spiralAcc = fract(sprSum);
    float t = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98);
    outRgb = palette(t);

    float nearEdge = (1.0 - tLin) * (1.0 - tLin);
    outRgb *= 1.0 + 0.22 * nearEdge;
    outRgb = mix(outRgb, outRgb * 1.07, tLin * 0.2);
  } else {
    float ang = juliaAngleCont(z.x, z.y);
    float rm2 = length(z);
    float lf = log(max(rm2, 5e-7));
    float zx0 = complexCoord.x;
    float zy0 = complexCoord.y;

    float tunI = clamp(uVortexTunnel, 0.0, 1.0);
    float sub = 0.5 + 0.5 * sin(ang * mix(1.55, 1.12, tunI) + lf * mix(1.25, 0.62, tunI) + uPaletteOffset * 0.22);
    vec3 deep = vec3(0.018, 0.026, 0.072);
    vec3 lift = vec3(0.065, 0.056, 0.15);
    outRgb = mix(deep, lift, sub);

    float grain = 0.5 + 0.5 * sin(zx0 * 9.0 + zy0 * 7.5 + lf * 2.8);
    outRgb += vec3(0.015, 0.02, 0.038) * grain;

    float rI = length(vec2(zx0, zy0));
    float aI = juliaAngleCont(zx0, zy0);
    float lrI = log(rI + 1e-6);
    float spIFull = lrI * 0.5 + uSpiralPhase * mix(0.25, 0.38, tunI) + lf * 0.055;
    spIFull += 0.038 * sin(2.0 * aI + lrI * mix(1.05, 0.4, tunI) + uSpiralPhase * 0.7);
    spIFull += 0.026 * sin(4.0 * ang + lf * mix(0.9, 0.38, tunI) + uPaletteOffset * 1.4);
    spIFull += 0.048 * tunI * sin(1.35 * aI + lrI * 0.42 + uSpiralPhase * 1.02);
    float sprI = fract(spIFull);
    vec3 sArm = palette(0.1 + sprI * 0.62);
    sArm *= vec3(0.26, 0.28, 0.4);
    outRgb = mix(outRgb, sArm, 0.44 * (0.55 + 0.45 * sub));
    outRgb = clamp(outRgb, 0.0, 1.0);
  }

  // Safety feather at the angular branch direction to suppress tiny precision seams.
  float seam = abs(sin(0.5 * ar));
  float seamMask = smoothstep(0.0, 0.045, seam);
  outRgb *= mix(0.985, 1.0, seamMask);

  float tr = clamp(uTransparentTunnel, 0.0, 1.0);
  float lum = dot(clamp(outRgb, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
  float alpha = mix(1.0, clamp(0.06 + 0.94 * smoothstep(0.03, 0.62, lum), 0.0, 1.0), tr);
  gl_FragColor = vec4(outRgb, alpha);
}
`;
