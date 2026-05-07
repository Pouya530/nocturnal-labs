/** GLSL for Julia-textured wormhole rings + skybox (see `JULIA_WORMHOLE_PLAN.md`). */

export const wormholeJuliaVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wormholeJuliaFragment = /* glsl */ `
precision highp float;
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

vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.55);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (c * t + d));
}

void main() {
  vec2 p;
  if (uMode > 1.5) {
    // Helix tube (TubeGeometry): u along the curve, v around the cross-section — Julia lives on the strand.
    vec2 par = vViewDir.xy * (0.062 / max(uZoom, 1e-3));
    float along = vUv.x * 2.2 + uDepth * 0.0045 + uTime * 0.016;
    float alongWrap = fract(along);
    float ang = vUv.y * 6.28318530718 + uIndex * 2.094395 + uDepth * 0.017;
    p = vec2((alongWrap * 2.0 - 1.0) * 1.05, (vUv.y * 2.0 - 1.0) * 0.98);
    p += par * (0.26 + 0.52 * vUv.y);
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
  vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

  const int MAX_ITERS = 96;
  const float B = 64.0;
  vec2 z = z0;
  float m2 = dot(z, z);
  float n = 0.0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (m2 > B * B) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    n += 1.0;
  }
  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;

  float t = 0.04 * sn + 0.06 * uDepth + uIndex * 0.07;
  vec3 col = palette(t);

  float escaped = step(B * B, m2);
  col *= mix(0.18, 1.6, escaped);
  col = 1.0 - exp(-col * uIntensity);

  if (uMode < 0.5) {
    float innerHole = smoothstep(0.0, 0.22, vUv.y);
    col *= mix(0.78, 1.0, innerHole);

    float lipInner = smoothstep(0.0, 0.055, vUv.y) * (1.0 - smoothstep(0.0, 0.17, vUv.y));
    float lipOuter = smoothstep(0.945, 1.0, vUv.y) * (1.0 - smoothstep(0.83, 1.0, vUv.y));
    vec3 lipCol = vec3(0.42, 0.52, 1.0) * 0.5;
    col += (lipInner + lipOuter) * lipCol;

    float ang = vUv.x * 6.28318530718 * 2.0;
    float cyl = 0.86 + 0.14 * sin(ang + uTime * 0.22 + uIndex * 0.35);
    col *= cyl;

    float dN = clamp(uDistAhead / 210.0, 0.0, 1.0);
    vec3 farCool = vec3(0.38, 0.48, 1.08);
    col = mix(col * farCool, col, 1.0 - dN * 0.45);
    col *= 1.0 + (1.0 - dN) * 0.2;
  } else if (uMode > 1.5) {
    // Helix tube (mode 2): same language as rings — lip sheen, sweep, distance tint, additive glow.
    float innerHoleH = smoothstep(0.0, 0.24, vUv.y);
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
    float alongMask = smoothstep(0.0, 0.035, vUv.x) * smoothstep(1.0, 0.965, vUv.x);
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
}
`;
