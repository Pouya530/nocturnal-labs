/**
 * Fullscreen Julia set — ported from the **Cymatics Portal** engine (`_engine_iife.js` +
 * `_portal_splat_inject.js`, "fractalJulia" visual mode). Produces the vivid continuous
 * cosine-palette look with spiral-phase banding inside the escape + a soft interior.
 *
 * Uses `gl_FragCoord` (via `juliaFractalVertCover`, a single NDC-covering triangle) so there
 * is no diagonal seam from a two-triangle quad.
 */

/** @deprecated R3F plane only — not used on landing; landing uses juliaFractalVertCover */
export const juliaFractalVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * One clip-space triangle that covers the viewport — no vUv, no internal diagonal.
 */
export const juliaFractalVertCover = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/** @deprecated use juliaFractalVertCover */
export const juliaFractalVertFullscreen = juliaFractalVertCover;

/**
 * Julia-mode fragment shader (Cymatics port).
 *
 * Uniforms:
 *  - `uResolution`      — canvas size in device pixels.
 *  - `uC`               — Julia c-parameter (animated on a small disc around -0.7269, 0.1889).
 *  - `uZoom`            — base zoom; 0.48 matches the engine's `juliaZoomFixed`.
 *  - `uMaxIter`         — iteration ceiling (float; compared inside the bounded loop).
 *  - `uPaletteOffset`   — continuous rainbow rotation (time-driven).
 *  - `uColorIntensity`  — saturation mix (0.5 = desaturated → 1 = full vivid).
 *  - `uSpiralPhase`     — accumulated phase for spiral banding.
 *  - `uViewAngle`       — slow rotation of the complex plane.
 *  - `uBarrelK`         — portal intro: 0 = off; >0 warps v_coord (barrel) for edge bend.
 */
export const juliaFractalFrag = /* glsl */ `
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

// Continuous cosine-based rainbow palette — the core of the Cymatics "psychedelic" look.
vec3 palette(float t) {
  float hue = t * 3.0 + uPaletteOffset;
  float r = 0.5 + 0.5 * cos(6.28318 * hue);
  float g = 0.5 + 0.5 * cos(6.28318 * (hue + 0.33));
  float b = 0.5 + 0.5 * cos(6.28318 * (hue + 0.67));
  vec3 base = vec3(r, g, b);
  float sat = 0.5 + uColorIntensity * 0.5;
  return mix(vec3(0.5), base, sat);
}

// Atan2 variant that stays continuous across the branch cut (half-angle form).
float juliaAngleCont(float zx, float zy) {
  float rh = length(vec2(zx, zy));
  if (rh < 1e-7) return 0.0;
  return 2.0 * atan(zy, zx + rh + 1e-7);
}

void main() {
  // Per-pixel UV from gl_FragCoord — avoids the diagonal seam that UV-from-quad can produce.
  vec2 uv;
  uv.x = (gl_FragCoord.x + 0.5) / uResolution.x;
  uv.y = 1.0 - (gl_FragCoord.y + 0.5) / uResolution.y;
  vec2 v_coord = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  // Radial barrel — stronger at edges, feels like a lens / portal during intro
  float rad = max(length(v_coord), 1e-4);
  v_coord *= 1.0 + uBarrelK * (rad * rad);

  float scale = pow(2.0, uZoom);
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (v_coord * aspect) / scale;

  float cr = cos(uViewAngle);
  float sr = sin(uViewAngle);
  vec2 pr = vec2(p.x * cr + p.y * sr, -p.x * sr + p.y * cr);

  // u_center is fixed at (0, 0) in Julia mode (the engine uses a fixed center + fixed zoom).
  vec2 complexCoord = pr;
  vec2 z = complexCoord;
  vec2 c = uC;

  float n = -1.0;
  // Bounded loop with runtime cutoff (WebGL1 GLSL ES 1.00 requires a constant bound).
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
    // Escaped region — spiral-phase modulated palette (vivid, psychedelic).
    float tLin = clamp(n / denom, 0.0, 1.0);
    float zx0 = complexCoord.x;
    float zy0 = complexCoord.y;
    float r0 = length(vec2(zx0, zy0));
    float a0 = juliaAngleCont(zx0, zy0);
    float lr0 = log(r0 + 1e-6);

    float spr0 = lr0 * 0.48 + uSpiralPhase * 0.26 + uPaletteOffset * 0.07;
    spr0 += 0.036 * sin(2.0 * a0 + lr0 * 1.15 + uSpiralPhase * 0.85);
    spr0 += 0.024 * sin(4.0 * a0 + uPaletteOffset * 2.1 + lr0 * 0.65);

    float zr2 = z.x * z.x + z.y * z.y;
    float zang = juliaAngleCont(z.x, z.y);
    float zlr = log(zr2) * 0.5;

    float sprEsc = zlr * 0.13;
    sprEsc += 0.030 * sin(2.0 * zang + zlr * 0.9 + uSpiralPhase * 0.5);
    sprEsc += 0.020 * cos(4.0 * zang + zlr * 0.45 + uPaletteOffset * 1.3);

    float sprSum = spr0 + sprEsc + tLin * 0.1;
    float spiralAcc = fract(sprSum);
    float t = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98);
    outRgb = palette(t);

    float nearEdge = (1.0 - tLin) * (1.0 - tLin);
    outRgb *= 1.0 + 0.22 * nearEdge;
    outRgb = mix(outRgb, outRgb * 1.07, tLin * 0.2);
  } else {
    // Interior (non-escaping) — soft indigo field with subtle spiral arms.
    float ang = juliaAngleCont(z.x, z.y);
    float rm = length(z);
    float lf = log(max(rm, 5e-7));
    float zx0 = complexCoord.x;
    float zy0 = complexCoord.y;

    float sub = 0.5 + 0.5 * sin(ang * 1.55 + lf * 1.25 + uPaletteOffset * 0.22);
    vec3 deep = vec3(0.018, 0.026, 0.072);
    vec3 lift = vec3(0.065, 0.056, 0.15);
    outRgb = mix(deep, lift, sub);

    float grain = 0.5 + 0.5 * sin(zx0 * 9.0 + zy0 * 7.5 + lf * 2.8);
    outRgb += vec3(0.015, 0.02, 0.038) * grain;

    float rI = length(vec2(zx0, zy0));
    float aI = juliaAngleCont(zx0, zy0);
    float lrI = log(rI + 1e-6);
    float spIFull = lrI * 0.5 + uSpiralPhase * 0.25 + lf * 0.055;
    spIFull += 0.038 * sin(2.0 * aI + lrI * 1.05 + uSpiralPhase * 0.7);
    spIFull += 0.026 * sin(4.0 * ang + lf * 0.9 + uPaletteOffset * 1.4);
    float sprI = fract(spIFull);
    vec3 sArm = palette(0.1 + sprI * 0.62);
    sArm *= vec3(0.26, 0.28, 0.4);
    outRgb = mix(outRgb, sArm, 0.44 * (0.55 + 0.45 * sub));
    outRgb = clamp(outRgb, 0.0, 1.0);
  }

  gl_FragColor = vec4(outRgb, 1.0);
}
`;
