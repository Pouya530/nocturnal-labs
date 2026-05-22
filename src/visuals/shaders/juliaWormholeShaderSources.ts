/** GLSL for Julia-textured wormhole rings + skybox (see `JULIA_WORMHOLE_PLAN.md`). */

export const wormholeJuliaVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

export const wormholeJuliaFragment = /* glsl */ `
precision highp float;
#include <common>
#include <fog_pars_fragment>

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewDir;
uniform float uTime;
uniform float uDepth;
uniform float uIndex;
uniform float uZoom;
uniform float uIntensity;
uniform vec2 uCenter;
uniform float uDiscRadius;
uniform float uMode;
uniform float uScrollFade;
uniform float uDistAhead;
/** Rings + helix tubes: UV half-width (0–1) for rim alpha feather and edge glow (0 = off). */
uniform float uRingCylEdgeSoft;
/** Helix tubes (mode 2): scales additive rim halo; 1 default, >1 softer blend into void. */
uniform float uHelixEdgeHaloMul;
/** Helix tubes only: 0 classic; 1–6 lab styles. */
uniform float uHelixTubeVariant;
/** Helix tubes: 1 = Julia fractal interior; 0 = smooth ribbon (no fractal pattern). */
uniform float uHelixJuliaPattern;
/** Helix + Julia pattern on: multiplies interior color before bloom (1 = default). */
uniform float uHelixJuliaPatternBloomMul;
/** Helix + Julia pattern on: 0–1 multi-tap soften (reduces clipped / harsh interior seams). */
uniform float uHelixJuliaInteriorBlur;
/** Helix + Julia pattern on: 0–1 slow brightness shimmer along the strand. */
uniform float uHelixJuliaShimmer;
/** Ring / helix tube inner void (tunnelStore.holeRadius, default ~0.28). */
uniform float uHoleRadius;
/** Localhost dev: 0 = flat annulus; ~0.65 = subtle cylindrical wrap on ring shader (geometry unchanged). */
uniform float uRingCylLook;

vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.55);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (c * t + d));
}

const int MAX_ITERS = 128;
const float JULIA_B = 64.0;

void evalJulia(vec2 z0, vec2 juliaC, out float oSn, out float oEsc, out vec3 oTone) {
  vec2 z = z0;
  float m2 = dot(z, z);
  float n = 0.0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (m2 > JULIA_B * JULIA_B) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + juliaC;
    m2 = dot(z, z);
    n += 1.0;
  }
  oSn = n - log2(log2(max(m2, 1.0001))) + 4.0;
  float t = 0.04 * oSn + 0.06 * uDepth + uIndex * 0.07;
  vec3 pc = palette(t);
  oEsc = step(JULIA_B * JULIA_B, m2);
  pc *= mix(0.18, 1.6, oEsc);
  oTone = 1.0 - exp(-pc * uIntensity);
}

void main() {
  vec2 p;
  if (uMode > 1.5) {
    // Helix tube: smooth periodic u (sin) avoids fract(along) seams where the strand looked clipped.
    vec2 par = vViewDir.xy * (0.062 / max(uZoom, 1e-3));
    float w = vUv.x * 2.2 + uDepth * 0.0045 + uTime * 0.016;
    float px = sin(w * 6.28318530718) * 1.05;
    float py = (vUv.y * 2.0 - 1.0) * 0.98;
    p = vec2(px, py);
    p += par * (0.26 + 0.52 * vUv.y);
    float ang = vUv.y * 6.28318530718 + uIndex * 2.094395 + uDepth * 0.017;
    p += vec2(0.13 * sin(ang + uTime * 0.11), 0.13 * cos(ang * 1.04)) * 0.88;
  } else {
    p = (vUv - 0.5) * 2.0;
    if (uMode < 0.5) {
      vec2 par = vViewDir.xy * (0.058 / max(uZoom, 1e-3));
      p += par * (0.22 + 0.78 * vUv.y);
    }
  }
  vec2 z0 = p / max(uZoom, 1e-3);

  float ph1 = uTime * 0.13 + uIndex * 0.7 + uDepth * 0.15;
  float ph2 = uTime * 0.17 + uIndex * 1.1 + uDepth * 0.13;
  vec2 juliaC = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

  float sn;
  float escaped;
  vec3 col;
  evalJulia(z0, juliaC, sn, escaped, col);

  if (uMode > 1.5 && uHelixJuliaPattern > 0.5 && uHelixJuliaInteriorBlur > 1e-4) {
    float bb = clamp(uHelixJuliaInteriorBlur, 0.0, 1.0);
    vec2 d = vec2(0.014, 0.011) * (0.35 + bb * 0.65);
    float s1, e1; vec3 c1;
    evalJulia(z0 + d, juliaC, s1, e1, c1);
    float s2, e2; vec3 c2;
    evalJulia(z0 - d, juliaC, s2, e2, c2);
    float s3, e3; vec3 c3;
    evalJulia(z0 + vec2(-d.y, d.x), juliaC, s3, e3, c3);
    vec3 cAvg = (col + c1 + c2 + c3) * 0.25;
    float snAvg = (sn + s1 + s2 + s3) * 0.25;
    col = mix(col, cAvg, bb);
    sn = mix(sn, snAvg, bb * 0.9);
  }

  if (uMode > 1.5 && uHelixJuliaPattern > 0.5) {
    col *= uHelixJuliaPatternBloomMul;
  }

  if (uMode > 1.5 && uHelixJuliaPattern > 0.5 && uHelixJuliaShimmer > 1e-4) {
    float sh = sin(
      uTime * (1.85 + uHelixJuliaShimmer * 1.2)
      + vUv.x * 13.0
      + vUv.y * 8.5
      + uIndex * 2.7
      + uDepth * 0.018
    );
    col *= 1.0 + uHelixJuliaShimmer * 0.11 * sh;
  }

  if (uMode > 1.5 && uHelixJuliaPattern < 0.5) {
    float rib = 0.5 + 0.48 * sin(vUv.x * 10.0 + uDepth * 0.04 + uIndex * 1.7);
    float rib2 = 0.72 + 0.28 * sin(vUv.y * 5.0 + uTime * 0.15);
    vec3 base = palette(0.16 + uIndex * 0.11 + uTime * 0.025);
    base *= mix(0.42, 1.05, rib) * rib2;
    col = 1.0 - exp(-base * uIntensity * 0.9);
  }

  /** Lab styles apply on top of either Julia interior or smooth ribbon (pattern off). */
  if (uMode > 1.5 && uHelixTubeVariant > 0.5) {
    float hv = uHelixTubeVariant;
    vec3 colPre = col;
    if (hv < 1.5) {
      float filmPhase = mix(
        vUv.x * 9.0 + vUv.y * 5.0 + uIndex * 1.2,
        sn * 0.42,
        step(0.5, uHelixJuliaPattern)
      );
      float film = 0.5 + 0.5 * sin(filmPhase + uTime * 1.1 + uIndex * 2.1);
      float streak = pow(0.5 + 0.5 * sin(vUv.x * 40.0 - uTime * 0.9 + uDepth * 0.03), 3.0);
      col = mix(col, col * vec3(1.2, 0.75, 1.35), 0.38);
      col += vec3(0.25, 0.15, 0.85) * film * 0.45;
      col += vec3(0.35, 0.85, 1.0) * streak * 0.22;
    } else if (hv < 2.5) {
      float q = 5.0;
      col = floor(col * q + 0.15) / q;
      col *= vec3(0.75, 1.08, 1.15);
      float gx = abs(fract(vUv.x * 14.0 + uTime * 0.12) - 0.5);
      float gy = abs(fract(vUv.y * 6.0 + uIndex * 0.07) - 0.5);
      float grid = smoothstep(0.1, 0.0, gx) + smoothstep(0.1, 0.0, gy);
      col += vec3(0.2, 0.5, 1.0) * grid * 0.2;
    } else if (hv < 3.5) {
      float beat = 0.5 + 0.5 * sin(vUv.x * 22.0 + vUv.y * 11.0 + uTime * 0.42);
      vec3 colB;
      if (uHelixJuliaPattern > 0.5) {
        float tB = 0.04 * sn + 0.09 * uDepth + uIndex * 0.11 + 0.27;
        colB = palette(tB);
        colB *= mix(0.18, 1.6, escaped);
        colB = 1.0 - exp(-colB * uIntensity * 0.88);
      } else {
        float tB = 0.22 + uDepth * 0.02 + beat * 0.11 + uIndex * 0.06 + uTime * 0.03;
        colB = palette(tB);
        colB = 1.0 - exp(-colB * uIntensity * 0.88);
      }
      col = mix(colPre, colB, 0.2 + 0.55 * beat);
      col += vec3(0.12, 0.2, 0.35) * beat * (1.0 - beat) * 0.4;
    } else if (hv < 4.5) {
      float au = sin(vUv.y * 14.0 + uTime * 0.55 + uIndex * 0.8);
      vec3 shift = vec3(0.35, 0.85, 1.0) * au * 0.25;
      col = mix(col, col * vec3(0.75, 1.15, 1.25), 0.55);
      col += shift;
      col += vec3(0.15, 0.55, 0.95) * pow(0.5 + 0.5 * sin(vUv.x * 28.0 - uTime * 0.4), 2.0) * 0.2;
    } else if (hv < 5.5) {
      float core = 1.0 - abs(vUv.y * 2.0 - 1.0);
      core = pow(max(core, 0.0), 2.2);
      col *= vec3(1.15, 0.82, 0.65);
      col += vec3(1.0, 0.45, 0.12) * core * 0.35;
      col = pow(max(col, vec3(0.0)), vec3(0.92));
    } else {
      vec2 fh = fract(vUv * vec2(11.0, 5.5) + vec2(uIndex * 0.08, uTime * 0.06));
      float tri = min(min(fh.x + fh.y, (1.0 - fh.x) + fh.y), fh.x + (1.0 - fh.y));
      tri = step(0.38, tri);
      col = mix(col * 0.72, col * vec3(1.15, 1.08, 1.35), tri);
      col += vec3(0.12, 0.35, 0.85) * (1.0 - tri) * 0.18;
    }
  }

  if (uMode < 0.5) {
    float innerHole = smoothstep(0.0, uHoleRadius, vUv.y);
    col *= mix(0.78, 1.0, innerHole);

    float lipInner = smoothstep(0.0, 0.055, vUv.y) * (1.0 - smoothstep(0.0, 0.17, vUv.y));
    float lipOuter = smoothstep(0.945, 1.0, vUv.y) * (1.0 - smoothstep(0.83, 1.0, vUv.y));
    vec3 lipCol = vec3(0.42, 0.52, 1.0) * 0.5;
    col += (lipInner + lipOuter) * lipCol;

    float ang = vUv.x * 6.28318530718 * 2.0;
    float cylAmp = mix(0.14, 0.19, uRingCylLook);
    float cyl = (1.0 - cylAmp) + cylAmp * sin(ang + uTime * 0.22 + uIndex * 0.35);
    col *= cyl;

    if (uRingCylLook > 1e-3) {
      float wrapAng = vUv.x * 6.28318530718;
      float viewBias = atan(vViewDir.y, vViewDir.x) * 0.22;
      float facing = pow(max(0.0, sin(wrapAng + viewBias + uIndex * 0.31)), 1.85);
      col *= mix(1.0, 0.76 + 0.24 * facing, uRingCylLook * 0.58);

      float band = sin(wrapAng * 2.0 + uIndex * 0.41 + uTime * 0.14) * 0.5 + 0.5;
      float wallCurve = 0.74 + 0.26 * cos((vUv.y - band * 0.07) * 3.14159265 * 1.35);
      col *= mix(1.0, wallCurve, uRingCylLook * 0.42);

      float edgeCyl = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
      col *= mix(1.0, 0.84 + 0.16 * edgeCyl, uRingCylLook * 0.35);
    }

    float dN = clamp(uDistAhead / 210.0, 0.0, 1.0);
    vec3 farCool = vec3(0.38, 0.48, 1.08);
    col = mix(col * farCool, col, 1.0 - dN * 0.45);
    col *= 1.0 + (1.0 - dN) * 0.2;
  } else if (uMode > 1.5) {
    // Helix tube (mode 2): same language as rings — lip sheen, sweep, distance tint, additive glow.
    float innerHoleH = smoothstep(0.0, uHoleRadius * 1.05, vUv.y);
    col *= mix(0.82, 1.0, innerHoleH);

    float lipInnerH = smoothstep(0.0, 0.07, vUv.y) * (1.0 - smoothstep(0.0, 0.19, vUv.y));
    float lipOuterH = smoothstep(0.91, 1.0, vUv.y) * (1.0 - smoothstep(0.76, 1.0, vUv.y));
    vec3 lipColH = vec3(0.42, 0.52, 1.0) * 0.52;
    col += (lipInnerH + lipOuterH) * lipColH;

    float angH = vUv.x * 6.28318530718 * 3.0;
    float cylH = 0.88 + 0.12 * sin(angH + uTime * 0.2 + uIndex * 0.4);
    col *= cylH;

    float dNH = clamp(uDistAhead / 210.0, 0.0, 1.0);
    vec3 farCoolH = vec3(0.38, 0.48, 1.08);
    col = mix(col * farCoolH, col, 1.0 - dNH * 0.38);
    col *= 1.0 + (1.0 - dNH) * 0.16;
  }

  float alpha = 1.0;
  if (uMode < 0.5) {
    float innerEdge = smoothstep(0.0, 0.17, vUv.y);
    float outerEdge = smoothstep(1.0, 0.83, vUv.y);
    float radialMask = innerEdge * outerEdge;
    if (uRingCylEdgeSoft > 1e-5) {
      float w = uRingCylEdgeSoft * 2.15;
      float innerF = smoothstep(0.0, w, vUv.y);
      float outerF = smoothstep(1.0, 1.0 - w, vUv.y);
      float cylFeather = innerF * outerF;
      cylFeather = pow(max(cylFeather, 1e-4), 0.58);
      radialMask *= cylFeather;
      col *= mix(0.82, 1.0, cylFeather);
      vec3 rimGlow = vec3(0.52, 0.62, 1.0);
      float edgeHalo = (1.0 - cylFeather) * (1.0 - cylFeather);
      col += rimGlow * edgeHalo * 0.18;
    }
    alpha = radialMask * clamp(uScrollFade, 0.0, 1.0);
  } else if (uMode > 1.5) {
    float innerEdge = smoothstep(0.0, 0.11, vUv.y);
    float outerEdge = smoothstep(1.0, 0.89, vUv.y);
    float alongMask = smoothstep(0.0, 0.052, vUv.x) * smoothstep(1.0, 0.948, vUv.x);
    float tubeMask = innerEdge * outerEdge * alongMask;
    if (uRingCylEdgeSoft > 1e-5) {
      float w = uRingCylEdgeSoft * 2.15;
      float innerF = smoothstep(0.0, w, vUv.y);
      float outerF = smoothstep(1.0, 1.0 - w, vUv.y);
      float cylFeather = innerF * outerF;
      cylFeather = pow(max(cylFeather, 1e-4), 0.58);
      tubeMask *= cylFeather;
      col *= mix(0.84, 1.0, cylFeather);
      vec3 rimGlowH = vec3(0.52, 0.62, 1.0);
      float edgeHaloH = (1.0 - cylFeather) * (1.0 - cylFeather);
      col += rimGlowH * edgeHaloH * (0.24 * uHelixEdgeHaloMul);
    }
    alpha = tubeMask * clamp(uScrollFade, 0.0, 1.0);
  }
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}
`;
