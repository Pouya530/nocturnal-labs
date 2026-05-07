'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { motionPrefs } from '@/core/motion';
import {
  webglPowerPreference,
  webglWormholeAntialias,
  webglWormholePixelRatio,
} from '@/lib/webglMobilePrefs';
import { tunnelStore } from '@/tunnel/tunnelStore';
import { wormholeJuliaFragment, wormholeJuliaVertex } from '@/visuals/shaders/juliaWormholeShaderSources';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Cumulative distance along -Z for each ring index.
 * `flareFinalThird` + `!helixLab`: widen gaps in the final third (`/wormhole` classic).
 * `!flareFinalThird` + `!helixLab`: uniform spacing (`tunnelMode: 'throat'`). Helix: uniform by index.
 */
function computeTunnelRingDepths(
  helixLab: boolean,
  ringCount: number,
  baseSpacing: number,
  flareFinalThird: boolean,
): { ringDepthAlongZ: Float32Array; tunnelLength: number } {
  const ringDepthAlongZ = new Float32Array(Math.max(1, ringCount));
  ringDepthAlongZ[0] = 0;

  if (helixLab || ringCount < 2) {
    for (let i = 1; i < ringCount; i++) {
      ringDepthAlongZ[i] = i * baseSpacing;
    }
    return { ringDepthAlongZ, tunnelLength: ringCount * baseSpacing };
  }

  if (!flareFinalThird) {
    for (let i = 1; i < ringCount; i++) {
      ringDepthAlongZ[i] = i * baseSpacing;
    }
    const lastGap = baseSpacing;
    return { ringDepthAlongZ, tunnelLength: ringDepthAlongZ[ringCount - 1]! + lastGap };
  }

  const gapCount = ringCount - 1;
  const gapStart = Math.min(gapCount, Math.max(0, Math.floor(gapCount * (2 / 3))));
  let cum = 0;
  for (let g = 0; g < gapCount; g++) {
    let mul = 1;
    if (g >= gapStart) {
      const u = (g - gapStart) / Math.max(1, gapCount - 1 - gapStart);
      mul = 1 + smoothstep(0, 1, u) * 2.75;
    }
    cum += baseSpacing * mul;
    ringDepthAlongZ[g + 1] = cum;
  }

  const lastGap = ringDepthAlongZ[ringCount - 1]! - ringDepthAlongZ[ringCount - 2]!;
  return { ringDepthAlongZ, tunnelLength: ringDepthAlongZ[ringCount - 1]! + lastGap };
}

/** Default for all wormhole Three.js points: radial gradient so GL_POINTS are round, not square. */
function createCircleSpriteTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('JuliaWormholeBackdrop: 2d canvas context unavailable');
  const c = size * 0.5;
  const grd = ctx.createRadialGradient(c, c, 0, c, c, c - 0.5);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.72)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

const PALETTE = [
  new THREE.Color('#ff4da8'),
  new THREE.Color('#8e3bff'),
  new THREE.Color('#3b7bff'),
  new THREE.Color('#4dffb0'),
  new THREE.Color('#f5ff61'),
];

/** Default thin helical tubes; `/wormhole2` uses {@link HELIX_LAB} for three tangent ribbon strands. */
const HELIX_DEFAULT = {
  tubeRadius: 0.06,
  twistTurns: 6,
  radialScale: 0.78,
  wobbleAmp: 0.4,
  wobbleFreq: 18,
  opacity: 0.9,
  tubeRadialSegs: 8,
} as const;

/** Wormhole2 lab: three strands as a tangent “ribbon” bundle (scaled into the tunnel). */
const HELIX_LAB = {
  tubeRadius: 0.2,
  twistTurns: 3.1,
  radialScale: 0.96,
  wobbleAmp: 0.58,
  wobbleFreq: 9.5,
  opacity: 0.78,
  /** Few segments = flatter ribbon cross-section (still ≥3 for valid mesh). */
  tubeRadialSegs: 3,
} as const;

/** `classic` — near camera first; `throat` — far opening first, fly into rings that grow as you advance. */
export type WormholeTunnelMode = 'classic' | 'throat';

export type JuliaWormholeBackdropProps = {
  /**
   * When true (only `/wormhole2`), three tangent ribbon helices (scaled into the tunnel), lower
   * twist count — a testbed for future Julia-on-tube UV work.
   */
  helixLab?: boolean;
  /** `/wormhole3` — flip ring stack + growth curve so the throat opens ahead of you. */
  tunnelMode?: WormholeTunnelMode;
  /**
   * `/wormhole4` — shared unit ring geometry + inverted growth (large far → small near), doc
   * `WORMHOLE_GROWTH_INVERSION_FIX_1.md`. Ignored when `throat`. Can stack with `helixLab`
   * (`/wormhole5`).
   */
  ringGrowthInversion?: boolean;
  /**
   * Journey-driven FOV / dolly / mouse aim / bloom–fog ride from `/wormhole3` without switching
   * ring stack to `throat`. Use with `ringGrowthInversion` on `/wormhole4` or on top of `helixLab`
   * (`/wormhole5`).
   */
  throatCameraJourney?: boolean;
  /**
   * `/wormhole5` — add a short ring stack at the tunnel mouth even with `helixLab` on.
   * Rings are rendered over helices, then fade out as scroll depth advances through the intro.
   */
  introRingsOverlay?: boolean;
  /**
   * `/wormhole6` (prod home) — use full journey camera strength from the first frame (wide FOV /
   * dolly at the mouth, mouse aim), like `/wormhole3` throat mode. Without this, helix+intro+journey
   * ramps easing from depth 0 so the mouth matches `/wormhole2` framing first.
   */
  journeyCameraFromStart?: boolean;
  /**
   * `/wormhole6` — scale lab helix bundle to the tunnel wall (no inset); default lab uses ~0.88 so
   * ribbons sit inside the frame.
   */
  helixLabFullscreen?: boolean;
};

/**
 * Full-viewport Three.js wormhole: Julia rings, helices, particles, skybox, bloom.
 * Reads `tunnelStore` each frame (`depth`, `velocity`, Julia c, bloom, fog, ring params).
 */
export function JuliaWormholeBackdrop({
  helixLab = false,
  tunnelMode = 'classic',
  ringGrowthInversion = false,
  throatCameraJourney = false,
  introRingsOverlay = false,
  journeyCameraFromStart = false,
  helixLabFullscreen = false,
}: JuliaWormholeBackdropProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hx = helixLab ? HELIX_LAB : HELIX_DEFAULT;
    const roundPointsTex = createCircleSpriteTexture();

    const initial = tunnelStore.getState();
    const throat = tunnelMode === 'throat' && !helixLab;
    const useThroatCamera = throat || !!throatCameraJourney;
    const flareFinalThird = !helixLab && !throat;
    const useRingGrowthInversion = ringGrowthInversion && !throat;
    /** Full `/wormhole5` stack: lab helices + inverted rings + intro mouth overlay. */
    const wormhole5HelixLab = helixLab && introRingsOverlay && ringGrowthInversion;

    /** `/wormhole3` scroll arc: distant mouth → full-screen tube → emerge on far side. */
    /** Longer intro leg + stronger pull-back / wide FOV at j≈0 — small centered mouth (wormhole3 ref). */
    const THROAT_INTRO_FRAC = 0.24;
    const THROAT_EXIT_FRAC = 0.13;
    const throatJourneyCamZ = (j: number): number => {
      if (j < THROAT_INTRO_FRAC) {
        const u = 1 - j / THROAT_INTRO_FRAC;
        return u * u * 11.35;
      }
      if (j > 1 - THROAT_EXIT_FRAC) {
        const v = (j - (1 - THROAT_EXIT_FRAC)) / THROAT_EXIT_FRAC;
        return -THREE.MathUtils.smoothstep(0, 1, v) * 6.35;
      }
      return 0;
    };
    const throatJourneyFovAdd = (j: number): number => {
      if (j < THROAT_INTRO_FRAC) {
        const u = 1 - j / THROAT_INTRO_FRAC;
        return u * 17.5;
      }
      if (j > 1 - THROAT_EXIT_FRAC) {
        const v = (j - (1 - THROAT_EXIT_FRAC)) / THROAT_EXIT_FRAC;
        return v * 10.5;
      }
      return 0;
    };
    const throatExitBlend = (j: number) =>
      THREE.MathUtils.smoothstep(1 - THROAT_EXIT_FRAC, 0.998, j);
    const throatIntroBlend = (j: number) =>
      1 - THREE.MathUtils.smoothstep(0, THROAT_INTRO_FRAC, j);
    const { ringDepthAlongZ, tunnelLength: TUNNEL_LENGTH } = computeTunnelRingDepths(
      helixLab,
      initial.ringCount,
      initial.ringSpacing,
      flareFinalThird,
    );

    const wormholeDpr = webglWormholePixelRatio(window.devicePixelRatio || 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: webglWormholeAntialias(),
      powerPreference: webglPowerPreference(),
      alpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(wormholeDpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05010f, initial.fogDensity);

    const cameraFar = useRingGrowthInversion
      ? Math.max(500, TUNNEL_LENGTH + 200)
      : Math.max(600, TUNNEL_LENGTH + 420);
    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, cameraFar);
    camera.position.set(0, 0, 0);

    /** Wormhole4/5 Julia rings — rim alpha feather + glow (`uRingCylEdgeSoft` in fragment shader). */
    const RING_RIM_FEATHER_GLOW = 0.12;
    /** Intro mouth stack (`/wormhole5`): slightly wider feather so large radii stay soft. */
    const INTRO_RING_RIM_FEATHER_GLOW = 0.14;
    /** `/wormhole5`–`/wormhole6` helix ribbons: softer tube rim + stronger edge bloom vs `/wormhole2`. */
    const HELIX_WORMHOLE5_RIM_FEATHER = 0.24;
    const HELIX_WORMHOLE5_EDGE_HALO_MUL = 1.62;

    const makeMat = (
      idx: number,
      mode: 0 | 1 | 2,
      zoom = 1.6,
      intensity = 1.0,
      /** Rings: subtle transparent rim feather (wormhole4+ may use {@link RING_RIM_FEATHER_GLOW}). */
      ringCylEdgeSoft = 0.062,
      helixEdgeHaloMul = 1,
    ) =>
      new THREE.ShaderMaterial({
        vertexShader: wormholeJuliaVertex,
        fragmentShader: wormholeJuliaFragment,
        transparent: mode !== 1,
        blending: mode === 1 ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: mode === 1,
        side: mode === 1 ? THREE.BackSide : THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uIndex: { value: idx },
          uZoom: { value: zoom },
          uIntensity: { value: intensity },
          uCenter: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
          uDiscRadius: { value: initial.discRadius },
          uMode: { value: mode },
          uScrollFade: { value: 1 },
          uDistAhead: { value: 0 },
          uRingCylEdgeSoft: { value: ringCylEdgeSoft },
          uHelixEdgeHaloMul: { value: mode === 2 ? helixEdgeHaloMul : 1 },
        },
      });

    let skyJulia: THREE.ShaderMaterial | null = null;
    let skyMat: THREE.Material;
    if (helixLab) {
      skyMat = new THREE.MeshBasicMaterial({
        color: 0x030208,
        side: THREE.BackSide,
        fog: false,
      });
    } else {
      skyJulia = makeMat(0, 1, 0.55, 0.4);
      skyMat = skyJulia;
    }
    const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 48, 32), skyMat);
    scene.add(sky);

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1500 * 3);
    const starCol = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const r = 200 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
      starCol[i * 3] = tint.r;
      starCol[i * 3 + 1] = tint.g;
      starCol[i * 3 + 2] = tint.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        map: roundPointsTex,
        size: 1.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    scene.add(stars);

    const rings: THREE.Mesh[] = [];
    const ringMats: THREE.ShaderMaterial[] = [];
    const introRings: THREE.Mesh[] = [];
    const introRingMats: THREE.ShaderMaterial[] = [];
    let sharedRingGeo: THREE.RingGeometry | null = null;
    if (!helixLab) {
      if (useRingGrowthInversion) {
        sharedRingGeo = new THREE.RingGeometry(0.81, 1.0, 96, 1);
        for (let i = 0; i < initial.ringCount; i++) {
          const mat = makeMat(i, 0, 1.4 + (i % 5) * 0.12, 1.0, RING_RIM_FEATHER_GLOW);
          ringMats.push(mat);
          const mesh = new THREE.Mesh(sharedRingGeo, mat);
          mesh.position.z = -ringDepthAlongZ[i]!;
          mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
          mesh.userData.spin = 0.18 + (i % 7) * 0.022;
          mesh.userData.baseRingIntensity = 1;
          rings.push(mesh);
          scene.add(mesh);
        }
      } else {
        for (let i = 0; i < initial.ringCount; i++) {
          const mat = makeMat(i, 0, 1.4 + (i % 5) * 0.12, 1.0);
          ringMats.push(mat);
          const geo = new THREE.RingGeometry(initial.ringRadius * 0.81, initial.ringRadius, 80, 1);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.z = throat ? -(TUNNEL_LENGTH - ringDepthAlongZ[i]!) : -ringDepthAlongZ[i]!;
          mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
          mesh.userData.spin = 0.18 + (i % 7) * 0.022;
          mesh.userData.baseRingIntensity = 1;
          rings.push(mesh);
          scene.add(mesh);
        }
      }
    } else if (helixLab && useRingGrowthInversion) {
      sharedRingGeo = new THREE.RingGeometry(0.81, 1.0, 96, 1);
      for (let i = 0; i < initial.ringCount; i++) {
        const mat = makeMat(i, 0, 1.4 + (i % 5) * 0.12, 1.0, RING_RIM_FEATHER_GLOW);
        ringMats.push(mat);
        const mesh = new THREE.Mesh(sharedRingGeo, mat);
        mesh.position.z = -ringDepthAlongZ[i]!;
        mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
        mesh.userData.spin = 0.18 + (i % 7) * 0.022;
        mesh.userData.baseRingIntensity = 1;
        rings.push(mesh);
        scene.add(mesh);
      }
    }

    if (introRingsOverlay) {
      const introCount = 30;
      const introSpacing = initial.ringSpacing * 0.92;
      const introGeo = new THREE.RingGeometry(initial.ringRadius * 0.81, initial.ringRadius, 80, 1);
      for (let i = 0; i < introCount; i++) {
        const mat = makeMat(
          1_000 + i,
          0,
          1.34 + (i % 5) * 0.1,
          1.04,
          INTRO_RING_RIM_FEATHER_GLOW,
        );
        mat.depthWrite = false;
        mat.depthTest = false;
        const mesh = new THREE.Mesh(introGeo.clone(), mat);
        mesh.position.z = -(i * introSpacing);
        mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
        mesh.userData.spin = 0.18 + (i % 7) * 0.022;
        mesh.renderOrder = 40;
        introRings.push(mesh);
        introRingMats.push(mat);
        scene.add(mesh);
      }
    }

    const helices: THREE.Mesh[] = [];
    const helixMats: THREE.ShaderMaterial[] = [];
    const helixStrands = helixLab ? 3 : initial.helixCount;

    /** Lab: centers on radius R with 120° spacing stay tangent when R√3 = 2r; scale bundle to the tunnel wall. */
    const r0 = hx.tubeRadius;
    const R0 = (2 * r0) / Math.sqrt(3);
    const bundleOuter = R0 + r0;
    const helixWallInsetMul = helixLabFullscreen ? 1 : 0.88;
    const targetWall = initial.ringRadius * hx.radialScale * helixWallInsetMul;
    const bundleScale = helixLab ? targetWall / bundleOuter : 1;
    const helixTubeR = helixLab ? r0 * bundleScale : hx.tubeRadius;
    const helixPathR = (t01: number) => {
      if (helixLab) {
        return (
          bundleScale * (R0 + Math.sin(t01 * hx.wobbleFreq) * hx.wobbleAmp * 0.28)
        );
      }
      return (
        initial.ringRadius * hx.radialScale + Math.sin(t01 * hx.wobbleFreq) * hx.wobbleAmp
      );
    };

    const helixRimFeather = wormhole5HelixLab ? HELIX_WORMHOLE5_RIM_FEATHER : RING_RIM_FEATHER_GLOW;
    const helixMatIntensity = wormhole5HelixLab ? 1.26 : 1.05;
    const helixZoomNudge = wormhole5HelixLab ? 0.06 : 0;
    const helixEdgeHaloMul = wormhole5HelixLab ? HELIX_WORMHOLE5_EDGE_HALO_MUL : 1;

    for (let h = 0; h < helixStrands; h++) {
      const phaseOffset = (h / helixStrands) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const HELIX_PTS = 900;
      const HELIX_TWISTS = hx.twistTurns;
      for (let i = 0; i <= HELIX_PTS; i++) {
        const t = i / HELIX_PTS;
        const z = throat ? -(1 - t) * TUNNEL_LENGTH : -t * TUNNEL_LENGTH;
        const radius = helixPathR(t);
        const angle = phaseOffset + t * Math.PI * 2 * HELIX_TWISTS;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.TubeGeometry(
        curve,
        HELIX_PTS,
        helixTubeR,
        hx.tubeRadialSegs,
        false,
      );
      const mat = helixLab
        ? makeMat(
            h,
            2,
            1.42 + (h % 3) * 0.11 + helixZoomNudge,
            helixMatIntensity,
            helixRimFeather,
            helixEdgeHaloMul,
          )
        : new THREE.MeshBasicMaterial({
            color: PALETTE[h % PALETTE.length]!,
            transparent: true,
            opacity: hx.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
            fog: true,
            side: THREE.FrontSide,
          });
      if (helixLab) helixMats.push(mat as THREE.ShaderMaterial);
      const mesh = new THREE.Mesh(tube, mat);
      mesh.userData.basePhase = phaseOffset;
      /** Intro mouth rings use `renderOrder` 40 + no depth test; draw lab helices after so ribbons stay visible (`/wormhole5`). */
      if (helixLab && introRingsOverlay) mesh.renderOrder = 50;
      helices.push(mesh);
      scene.add(mesh);
    }

    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(initial.particleCount * 3);
    const pCol = new Float32Array(initial.particleCount * 3);
    const pPh = new Float32Array(initial.particleCount);
    for (let i = 0; i < initial.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * initial.ringRadius * 0.95;
      const z = -Math.random() * TUNNEL_LENGTH;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = z;
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
      pCol[i * 3] = tint.r;
      pCol[i * 3 + 1] = tint.g;
      pCol[i * 3 + 2] = tint.b;
      pPh[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('phase', new THREE.BufferAttribute(pPh, 1));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        map: roundPointsTex,
        size: 0.16,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true,
      }),
    );
    scene.add(particles);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(wormholeDpr);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      initial.bloomStrength,
      initial.bloomRadius,
      initial.bloomThreshold,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    let resizePending = false;
    const onResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        resizePending = false;
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (visualViewport) {
      visualViewport.addEventListener('resize', onResize);
    }

    /** `/wormhole3` — mouse aim + scroll velocity ride on the camera (throat only). */
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    let velRideSm = 0;
    const onMouseMove = (e: MouseEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      ptr.x = (e.clientX / w) * 2 - 1;
      ptr.y = -((e.clientY / h) * 2 - 1);
    };
    const pointerFine =
      typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    /** Wormhole6: mouse aim only on fine pointers (desktop); Wormhole3 path unchanged. */
    const attachMouseAim =
      useThroatCamera && (!journeyCameraFromStart || pointerFine);
    if (attachMouseAim) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    const clock = new THREE.Clock();
    let smoothedBank = 0;
    /** `/wormhole4` — `wormholeScrollHelixVelGain` couples helix twist to scroll velocity. */
    let helixVelStrafe = 0;
    /** Tunnel debug: random tilt targets + smoothed euler offsets (rad). */
    let randCamPulse = 0;
    let randCamLastDepth = 0;
    let randCamTx = 0;
    let randCamTy = 0;
    let randCamRx = 0;
    let randCamRy = 0;
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const s = tunnelStore.getState();
      const maxDepthForJourney = Math.max(1, s.maxDepth);
      const journey01 = useThroatCamera
        ? THREE.MathUtils.clamp(s.depth / maxDepthForJourney, 0, 1)
        : 0;
      const exitB = useThroatCamera ? throatExitBlend(journey01) : 0;
      const introB = useThroatCamera ? throatIntroBlend(journey01) : 0;

      /**
       * `/wormhole5` (helix lab + intro rings + journey): at the mouth, use the same framing as
       * `/wormhole2` (camera at z≈0, base FOV). Journey pull-back / wide FOV eases in after a
       * short depth so ribbons stay full-screen at the start.
       * `/wormhole6` sets `journeyCameraFromStart` to match `/wormhole3` throat from frame 0.
       */
      const journeyCamEasing = journeyCameraFromStart
        ? 1
        : helixLab && introRingsOverlay && throatCameraJourney
          ? THREE.MathUtils.smoothstep(0, 0.012, journey01)
          : 1;
      const journeyFovAdd =
        (useThroatCamera ? throatJourneyFovAdd(journey01) : 0) * journeyCamEasing;
      const journeyCamZAdd =
        (useThroatCamera ? throatJourneyCamZ(journey01) : 0) * journeyCamEasing;

      if (useThroatCamera) {
        if (!journeyCameraFromStart || pointerFine) {
          const ptrEase = 1 - Math.exp(-dt * 8.5);
          ptr.sx += (ptr.x - ptr.sx) * ptrEase;
          ptr.sy += (ptr.y - ptr.sy) * ptrEase;
        }
        const introRideRamp = THREE.MathUtils.smoothstep(0, THROAT_INTRO_FRAC * 0.55, journey01);
        const rideTarget = THREE.MathUtils.clamp(
          -s.velocity * 0.46 * introRideRamp,
          -2.65,
          2.65,
        );
        velRideSm += (rideTarget - velRideSm) * (1 - Math.exp(-dt * 6.8));
      } else {
        velRideSm += -velRideSm * (1 - Math.exp(-dt * 4));
      }

      const wrapUpper = 5;
      const wrapLower = -TUNNEL_LENGTH + wrapUpper;
      /** Fade as each ring passes the camera (forward recycle). */
      const fadeNearCam = 16;
      /**
       * Narrow band before the rear wrap: softens backward recycle + fade-in right after forward
       * jump, without dimming mid-tunnel rings (wide smoothsteps did that).
       */
      const fadeRearBand = Math.min(40, Math.max(22, TUNNEL_LENGTH * 0.11));

      const MAX_GROWTH = 4.5;
      const GROWTH_EXP = 4.5;

      /** `/wormhole4` — WORMHOLE_GROWTH_INVERSION_FIX_1.md */
      const RING_INV_BASE = 0.25;
      const RING_INV_MAX = 8.5;
      const RING_INV_POWER = 3.2;
      const RING_INV_FADE = 6;

      for (let ri = 0; ri < rings.length; ri++) {
        const ring = rings[ri]!;
        const mat = ringMats[ri]!;

        if (useRingGrowthInversion) {
          let relZ = ring.position.z + s.depth;
          if (relZ > RING_INV_FADE) {
            ring.position.z -= TUNNEL_LENGTH;
          } else if (relZ < -TUNNEL_LENGTH + RING_INV_FADE) {
            ring.position.z += TUNNEL_LENGTH;
          }
          const rrZ = ring.position.z + s.depth;
          const distAhead = Math.max(0, -rrZ);
          const tFar = Math.min(1, distAhead / Math.max(1e-6, TUNNEL_LENGTH));
          const growth = THREE.MathUtils.lerp(
            RING_INV_MAX,
            RING_INV_BASE,
            Math.pow(tFar, 1 / RING_INV_POWER),
          );
          // Doc uses unit ring in ~0–1 world space; our `ringRadius` is much larger (store default 8).
          // Without this, far rings are sub-pixel and the stack matches classic visually.
          const rw = initial.ringRadius;
          ring.scale.set(growth * rw, growth * rw, 1);

          let fade = 1;
          if (rrZ > 0) {
            fade = 1 - smoothstep(0, RING_INV_FADE, rrZ);
          }
          if (distAhead > TUNNEL_LENGTH - RING_INV_FADE * 2) {
            fade *= 1 - smoothstep(TUNNEL_LENGTH - RING_INV_FADE * 2, TUNNEL_LENGTH, distAhead);
          }

          mat.uniforms.uScrollFade.value = fade;
          const baseIntensity = (ring.userData.baseRingIntensity as number) ?? 1;
          mat.uniforms.uIntensity.value = baseIntensity * fade;
          mat.uniforms.uDistAhead.value = Math.min(distAhead, 210);

          const distFactor = THREE.MathUtils.clamp(tFar, 0, 1);
          const spinRate =
            (ring.userData.spin as number) * (1.6 - distFactor) + s.velocity * 0.04;
          ring.rotation.z += spinRate * dt;
          continue;
        }

        let relZ = ring.position.z + s.depth;

        if (relZ > wrapUpper) {
          ring.position.z -= TUNNEL_LENGTH;
        } else if (relZ < wrapLower) {
          ring.position.z += TUNNEL_LENGTH;
        }
        relZ = ring.position.z + s.depth;

        const distAhead = -relZ;

        const growthDenom =
          throat && !helixLab
            ? Math.max(96, initial.ringSpacing * 14)
            : TUNNEL_LENGTH;
        const tGrowth = THREE.MathUtils.clamp(Math.max(0, distAhead) / growthDenom, 0, 1);
        const growth =
          throat && !helixLab
            ? THREE.MathUtils.lerp(2.25, MAX_GROWTH * 1.06, Math.exp(-tGrowth * 1.65))
            : 1 + (MAX_GROWTH - 1) * Math.exp(-tGrowth * GROWTH_EXP);
        ring.scale.set(growth, growth, 1);

        let fadeIn = smoothstep(-2, 4, distAhead);
        let fadeOut = 1 - smoothstep(TUNNEL_LENGTH * 0.72, TUNNEL_LENGTH * 0.92, distAhead);

        let scrollFade = 1 - smoothstep(wrapUpper - fadeNearCam, wrapUpper, relZ);
        scrollFade *= smoothstep(wrapLower, wrapLower + fadeRearBand, relZ);

        if (throat && !helixLab) {
          // Stay fully visible through the pass; only dip alpha in the last moment before wrap.
          fadeIn = smoothstep(-120, 10, distAhead);
          fadeOut = 1 - smoothstep(TUNNEL_LENGTH * 0.988, TUNNEL_LENGTH * 0.9995, distAhead);
          const lastMomentZ = 3.2;
          scrollFade = 1 - smoothstep(wrapUpper - lastMomentZ, wrapUpper + 0.4, relZ);
          const rearTight = Math.min(fadeRearBand * 0.42, 26);
          scrollFade *= smoothstep(wrapLower, wrapLower + rearTight, relZ);
        }

        mat.uniforms.uScrollFade.value = scrollFade;

        const baseIntensity = (ring.userData.baseRingIntensity as number) ?? 1;
        const throatBoost = throat && !helixLab ? 1.1 : 1;
        const exitRingDim = throat ? 1 - exitB * 0.4 : 1;
        mat.uniforms.uIntensity.value = baseIntensity * fadeIn * fadeOut * throatBoost * exitRingDim;
        mat.uniforms.uDistAhead.value =
          throat && !helixLab
            ? Math.min(Math.max(0, distAhead), 92)
            : Math.max(0, distAhead);

        const tNorm = THREE.MathUtils.clamp(Math.max(0, distAhead) / TUNNEL_LENGTH, 0, 1);
        const distFactor = THREE.MathUtils.clamp(tNorm, 0, 1);
        const spinRate =
          (ring.userData.spin as number) * (0.6 + distFactor * 1.8) + s.velocity * 0.04;
        ring.rotation.z += spinRate * dt;
      }

      if (introRingsOverlay) {
        for (let ri = 0; ri < introRings.length; ri++) {
          const ring = introRings[ri]!;
          const mat = introRingMats[ri]!;
          const relZ = ring.position.z + s.depth;
          const distAhead = -relZ;
          const fadeIn = smoothstep(-2, 5, distAhead);
          const fadeOut = 1 - smoothstep(88, 170, distAhead);
          const introFade = fadeIn * fadeOut;
          mat.uniforms.uScrollFade.value = introFade;
          mat.uniforms.uIntensity.value = introFade * 1.05;
          mat.uniforms.uDistAhead.value = Math.max(0, distAhead);
          mat.uniforms.uTime.value = time;
          mat.uniforms.uDepth.value = s.depth;
          mat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
          mat.uniforms.uDiscRadius.value = s.discRadius;
          ring.rotation.z += ((ring.userData.spin as number) + s.velocity * 0.04) * dt;
        }
      }

      for (const m of ringMats) {
        m.uniforms.uTime.value = time;
        m.uniforms.uDepth.value = s.depth;
        m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        m.uniforms.uDiscRadius.value = s.discRadius;
      }
      if (skyJulia) {
        skyJulia.uniforms.uTime.value = time * 0.4;
        skyJulia.uniforms.uDepth.value = s.depth * 0.05;
        skyJulia.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        skyJulia.uniforms.uDiscRadius.value = s.discRadius;
        if (useThroatCamera) {
          skyJulia.uniforms.uIntensity.value = 0.4 * (1 + introB * 0.35 + exitB * 1.15);
        }
      }

      const helixShow = s.wormholeHelices3dEnabled !== false;
      const helixDistAhead = Math.max(0, TUNNEL_LENGTH * 0.46);
      const helixFadeIn = smoothstep(-2, 4, helixDistAhead);
      const helixFadeOut = 1 - smoothstep(TUNNEL_LENGTH * 0.72, TUNNEL_LENGTH * 0.92, helixDistAhead);
      const velFlare = Math.min(Math.abs(s.velocity) * 0.08, 0.35);
      /**
       * `/wormhole2` keeps ~0.55 idle forward → |v| feeds velFlare. Wormhole5 often starts at v=0;
       * when helix + inversion stack, nudge base so idle brightness matches lab without faking velocity.
       */
      const helixBase = wormhole5HelixLab
        ? 0.9
        : helixLab && useRingGrowthInversion
          ? 0.765
          : 0.72;
      const helixOpacityBoost = wormhole5HelixLab ? 1.12 : 1;

      if (helixShow) {
        for (let hi = 0; hi < helixMats.length; hi++) {
          const hm = helixMats[hi]!;
          hm.uniforms.uTime.value = time;
          hm.uniforms.uDepth.value = s.depth;
          hm.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
          hm.uniforms.uDiscRadius.value = s.discRadius;
          hm.uniforms.uDistAhead.value = helixDistAhead;
          hm.uniforms.uScrollFade.value = 1;
          hm.uniforms.uIntensity.value =
            (helixBase + velFlare) *
            helixFadeIn *
            helixFadeOut *
            hx.opacity *
            helixOpacityBoost;
        }
      }

      for (const h of helices) {
        h.visible = helixShow;
        if (!helixShow) continue;
        h.rotation.z =
          time * 0.18 + (h.userData.basePhase as number) * 0.3 + s.depth * 0.04 + helixVelStrafe;
        if (!helixLab) {
          const hm = h.material as THREE.MeshBasicMaterial;
          const flare = Math.min(Math.abs(s.velocity) * 0.08, 0.35);
          let op = 0.85 + flare;
          if (useThroatCamera) op *= 1 - exitB * 0.58;
          hm.opacity = op;
        }
      }

      const positions = pGeo.attributes.position!.array as Float32Array;
      const phases = pGeo.attributes.phase!.array as Float32Array;
      const dz = s.velocity * dt * 12;
      for (let i = 0; i < initial.particleCount; i++) {
        positions[i * 3 + 2] += dz;
        if (positions[i * 3 + 2] > 5) positions[i * 3 + 2] -= TUNNEL_LENGTH;
        else if (positions[i * 3 + 2] < -TUNNEL_LENGTH + 5) positions[i * 3 + 2] += TUNNEL_LENGTH;
        const x = positions[i * 3]!;
        const y = positions[i * 3 + 1]!;
        const angSpeed = 0.04 + phases[i]! * 0.002;
        const cs = Math.cos(angSpeed * dt);
        const sn = Math.sin(angSpeed * dt);
        positions[i * 3] = x * cs - y * sn;
        positions[i * 3 + 1] = x * sn + y * cs;
      }
      pGeo.attributes.position!.needsUpdate = true;

      stars.rotation.z = time * 0.005;
      if (useThroatCamera) {
        const sm = stars.material as THREE.PointsMaterial;
        sm.opacity = 0.7 * (1 - introB * 0.28 + exitB * 0.22);
      }

      bloomPass.strength = s.bloomStrength * (useThroatCamera ? 1 + exitB * 0.14 : 1);
      bloomPass.radius = s.bloomRadius;
      bloomPass.threshold = s.bloomThreshold;

      if (scene.fog instanceof THREE.FogExp2) {
        let fd = s.fogDensity;
        if (useThroatCamera) {
          let introFog = introB;
          if (helixLab && introRingsOverlay && throatCameraJourney) {
            introFog *= 0.42;
          }
          fd *= 1 - introFog * 0.42;
          fd *= 1 - exitB * 0.55;
        }
        scene.fog.density = fd;
      }

      if (!motionPrefs.reduced) {
        // ── Camera "going through the tunnel" effects ──
        // All three are subtle — additive on top of the wall flow, not replacing it.

        // 1. Velocity-driven FOV breathing — speed lines / hyperspace lens stretch.
        //    Faster scroll = wider FOV (warps periphery inward).
        const baseFov = 72 + journeyFovAdd;
        const targetFov = baseFov + Math.min(Math.abs(s.velocity) * 0.65, 8);
        camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 6));
        camera.updateProjectionMatrix();

        // 2. Forward dolly with elastic recoil — camera lurches forward on velocity
        //    bursts then springs back to z=0. Reads as "weight" inside the tube.
        const dollyTarget = -Math.min(Math.abs(s.velocity) * 0.16, 1);
        const scrollRideZ = useThroatCamera ? velRideSm * journeyCamEasing : 0;
        const targetZ = dollyTarget + journeyCamZAdd + scrollRideZ;
        camera.position.z += (targetZ - camera.position.z) * (1 - Math.exp(-dt * 4));

        // 3. High-frequency wobble — off (was velocity × sin; felt too busy while scrolling).
        camera.position.x = 0;
        camera.position.y = 0;

        // 4. Slight roll banking — when scrolling hard, the camera banks like a plane.
        //    Direction matches velocity sign so reverse scroll banks the other way.
        const bankTarget = -Math.sign(s.velocity) * Math.min(Math.abs(s.velocity) * 0.005, 0.032);
        smoothedBank += (bankTarget - smoothedBank) * (1 - Math.exp(-dt * 3));

        // Re-aim camera down the tube (shake displaced position, but lookAt restores aim).
        // Roll is applied after lookAt so banking is not cleared.
        const lookX = useThroatCamera ? ptr.sx * 0.64 * journeyCamEasing : 0;
        const lookY = useThroatCamera ? ptr.sy * 0.42 * journeyCamEasing : 0;
        camera.lookAt(lookX, lookY, -10);
        camera.rotateZ(smoothedBank);

        const randTilt = s.wormholeDebugRandomCamTilt;
        if (randTilt) {
          randCamPulse += dt;
          const scrolling =
            Math.abs(s.velocity) > 0.032 || Math.abs(s.depth - randCamLastDepth) > 5.5;
          randCamLastDepth = s.depth;
          if (scrolling && randCamPulse > 0.34) {
            randCamPulse = 0;
            randCamTx = (Math.random() - 0.5) * 0.44;
            randCamTy = (Math.random() - 0.5) * 0.38;
          }
          randCamRx += (randCamTx - randCamRx) * (1 - Math.exp(-dt * 4.2));
          randCamRy += (randCamTy - randCamRy) * (1 - Math.exp(-dt * 4.2));
          camera.rotateX(randCamRx);
          camera.rotateY(randCamRy);
        } else {
          randCamTx = 0;
          randCamTy = 0;
          randCamRx += (0 - randCamRx) * (1 - Math.exp(-dt * 6));
          randCamRy += (0 - randCamRy) * (1 - Math.exp(-dt * 6));
        }
      } else {
        smoothedBank = 0;
        if (useThroatCamera) {
          camera.fov = 72 + journeyFovAdd;
          camera.position.set(0, 0, journeyCamZAdd + velRideSm * journeyCamEasing);
          camera.updateProjectionMatrix();
        } else {
          camera.fov = 72;
          camera.updateProjectionMatrix();
          camera.position.set(0, 0, 0);
        }
        const lookXr = useThroatCamera ? ptr.sx * 0.64 * journeyCamEasing : 0;
        const lookYr = useThroatCamera ? ptr.sy * 0.42 * journeyCamEasing : 0;
        camera.lookAt(lookXr, lookYr, -10);
      }

      composer.render(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === 'visible') clock.getDelta();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', onResize);
      }
      if (attachMouseAim) window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVis);
      composer.dispose();
      if (sharedRingGeo) {
        sharedRingGeo.dispose();
        for (const r of rings) {
          (r.material as THREE.Material).dispose();
        }
      } else {
        for (const r of rings) {
          r.geometry.dispose();
          (r.material as THREE.Material).dispose();
        }
      }
      for (const r of introRings) {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      for (const h of helices) {
        h.geometry.dispose();
        (h.material as THREE.Material).dispose();
      }
      pGeo.dispose();
      (particles.material as THREE.Material).dispose();
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      roundPointsTex.dispose();
      skyMat.dispose();
      sky.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [
    helixLab,
    tunnelMode,
    ringGrowthInversion,
    throatCameraJourney,
    introRingsOverlay,
    journeyCameraFromStart,
    helixLabFullscreen,
  ]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen"
      aria-hidden
    />
  );
}
