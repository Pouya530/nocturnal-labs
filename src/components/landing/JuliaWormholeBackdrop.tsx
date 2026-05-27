'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { motionPrefs } from '@/core/motion';
import {
  isChromiumDesktopBrowser,
  webglPowerPreference,
  wormholeNarrowViewport,
} from '@/lib/webglMobilePrefs';
import { computeWormholeCoinFollowCam } from '@/lib/wormholeCoinFollowCam';
import { resolveWormholeHelixQuality } from '@/tunnel/wormholeHelixQuality';
import { resolveWormholeTunnelQuality } from '@/tunnel/wormholeTunnelQuality';
import { WORMHOLE_DESKTOP_PROD_TONE_EXPOSURE } from '@/lib/wormholePageConfig';
import { wormholeDesktopProductionHighQuality } from '@/lib/wormholeProductionQuality';
import {
  isWormholeTouchScrollPrimary,
  WORMHOLE_MOBILE_CAM_VEL_BANK_CAP,
  WORMHOLE_MOBILE_CAM_VEL_BANK_EASE,
  WORMHOLE_MOBILE_CAM_VEL_BANK_MUL,
  WORMHOLE_MOBILE_CAM_VEL_DOLLY_CAP,
  WORMHOLE_MOBILE_CAM_VEL_DOLLY_EASE,
  WORMHOLE_MOBILE_CAM_VEL_DOLLY_MUL,
  WORMHOLE_MOBILE_CAM_VEL_FOV_CAP,
  WORMHOLE_MOBILE_CAM_VEL_FOV_EASE,
  WORMHOLE_MOBILE_CAM_VEL_FOV_MUL,
  WORMHOLE_MOBILE_MOUTH_CAM_Z_CAP,
  WORMHOLE_MOBILE_MOUTH_FOV_ADD_CAP,
} from '@/lib/wormholeScrollMobile';
import { getWormhole5AmbientPlaybackTime } from '@/audio/wormhole5AmbientAudio';
import { tickWormholeAmbientEqualizer } from '@/audio/wormholeAmbientEqualizer';
import { wormholeDevRingCylinderLook } from '@/lib/wormholeDevRingCylinder';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import {
  WORMHOLE_HOME_HELIX_FULLSCREEN_WALL_MUL,
  WORMHOLE_HOME_HELIX_RING_STACK_FILL_BOOST,
} from '@/lib/wormholePageConfig';
import {
  applyRandomCamTiltAfterLookAt,
  createRandomCamTiltRuntime,
} from '@/lib/wormholeRandomCamTilt';
import { tunnelZoomMul } from '@/lib/tunnelZoomGain';
import {
  DRIFT_MOTE_PHYSICS,
  driftMoteWaveAmp,
  driftMoteWaveSample,
  isDriftMoteWaveActive,
} from '@/lib/wormholeDriftMotePhysics';
import {
  clearLiveDriftMoteParticleSamples,
  publishLiveDriftMoteParticleSamples,
} from '@/lib/wormholeDriftMoteParticleBridge';
import { journeyMouseParallaxMul } from '@/tunnel/wormholeJourneyMouseParallax';
import { tunnelStore } from '@/tunnel/tunnelStore';
import { wormholeJuliaFragment, wormholeJuliaVertex } from '@/visuals/shaders/juliaWormholeShaderSources';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Lab helices on narrow viewports: multiply {@link UnrealBloomPass} strength by this (25% softer bloom). */
/** Narrow viewports: bump bloom strength after helix tuning (+10%). */
const MOBILE_BLOOM_STRENGTH_MUL = 1.1;

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
  /**
   * Segments around the tube circumference. **3** reads as a triangular prism from the mouth view
   * (three obvious facets); **8** matches {@link HELIX_DEFAULT} for a round ribbon without changing shaders.
   */
  tubeRadialSegs: 8,
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
   * `/wormhole5` — scale journey FOV/dolly by `tunnelStore.wormholeHomeIntroCam01` (0→1) for an opening
   * zoom-out without forcing `journeyCameraFromStart` (mouth depth easing + mouse aim unchanged).
   */
  openingJourneyCameraIntro?: boolean;
  /**
   * `/wormhole6` — scale lab helix bundle past nominal tunnel wall for corner fill under camera FOV
   * ({@link WORMHOLE_HOME_HELIX_FULLSCREEN_WALL_MUL}); default lab uses ~0.88 inset.
   */
  helixLabFullscreen?: boolean;
  /**
   * When set and `helixLabFullscreen` is false: multiplier for helix bundle radius (`ringRadius × radialScale × this`).
   * Omit to use lab default `0.88` (same as `/wormhole2`).
   */
  helixWallInsetMul?: number;
  /**
   * `/` production — render lab helices like `/wormhole2` (rim feather, intensity, spiral emphasis)
   * while keeping Julia inversion rings + journey camera unchanged.
   */
  helixWormhole2RibbonStyle?: boolean;
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
  openingJourneyCameraIntro = false,
  helixLabFullscreen = false,
  helixWallInsetMul: helixWallInsetMulProp,
  helixWormhole2RibbonStyle = false,
}: JuliaWormholeBackdropProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const tunnelQualityRevision = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeTunnelQualityRevision,
    () => 0,
  );
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hqDesktopProd = wormholeDesktopProductionHighQuality();
    const devRingCylLook = wormholeDevRingCylinderLook();
    const initial = tunnelStore.getState();
    const tunnelQ = resolveWormholeTunnelQuality(initial);
    const helixQ = resolveWormholeHelixQuality(initial);
    const ringSegsInversion = tunnelQ.ringSegsInversion;
    const ringSegsClassic = tunnelQ.ringSegsClassic;
    const hxBase = helixLab ? HELIX_LAB : HELIX_DEFAULT;
    const hx = {
      ...hxBase,
      tubeRadialSegs: helixQ.tubeRadialSegs,
      ...(helixLab
        ? {
            tubeRadius: helixQ.tubeRadius,
            twistTurns: helixQ.twistTurns,
            radialScale: helixQ.radialScale,
            wobbleAmp: helixQ.wobbleAmp,
            wobbleFreq: helixQ.wobbleFreq,
            opacity: helixQ.opacity,
          }
        : {}),
    };
    const roundPointsTex = createCircleSpriteTexture(tunnelQ.moteSpriteSize);
    const localhostHelixLabRibbonToggle =
      helixLab && typeof window !== 'undefined' && isLocalhostHostname(window.location.hostname);
    const initialHelixRibbonJuliaShader =
      !helixLab || !localhostHelixLabRibbonToggle || initial.wormholeHelixJuliaRibbonShaderEnabled;
    const throat = tunnelMode === 'throat' && !helixLab;
    const useThroatCamera = throat || !!throatCameraJourney;
    const flareFinalThird = !helixLab && !throat;
    const useRingGrowthInversion = ringGrowthInversion && !throat;
    /** Softer helix ribbons / halo matching wormhole5 aesthetic — used with mouth overlay or fullscreen prod lab (`helixLabFullscreen`). */
    const wormhole5HelixLab = helixLab && ringGrowthInversion && (introRingsOverlay || helixLabFullscreen);
    /** Helix tubes only: downgrade to `/wormhole2` ribbon look while rings stay on wormhole5/inversion stack. */
    const helixRibbonGradeWormhole5 = wormhole5HelixLab && !helixWormhole2RibbonStyle;

    /**
     * `/wormhole5` + `openingJourneyCameraIntro`: mouth framing before `wormholeHomeIntroCam01` ramps — keep
     * part of the journey wide-shot so the opening doesn't feel clamped on the coin stack.
     */
    const OPENING_JOURNEY_INTRO_BASE_FRAC = 0.28;

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

    const wormholeDpr = tunnelQ.rendererDpr;

    const renderer = new THREE.WebGLRenderer({
      antialias: tunnelQ.rendererAntialias,
      powerPreference: webglPowerPreference(),
      alpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(wormholeDpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = hqDesktopProd ? WORMHOLE_DESKTOP_PROD_TONE_EXPOSURE : 1.05;
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
    const hqTunnelRings = tunnelQ.ringSegsInversion >= 192;
    const RING_RIM_FEATHER_GLOW = hqTunnelRings ? 0.06 : hqDesktopProd ? 0.06 : 0.12;
    /** Helix ribbons when not on wormhole5 grade — fixed dev feather (not tied to ring HQ). */
    const HELIX_RIM_FEATHER_DEV = 0.12;
    /** Intro mouth stack (`/wormhole5`): slightly wider feather so large radii stay soft. */
    const INTRO_RING_RIM_FEATHER_GLOW = hqTunnelRings ? 0.1 : 0.14;
    /** `/wormhole5`–`/wormhole6` helix ribbons: softer tube rim + stronger edge bloom vs `/wormhole2`. */
    const HELIX_WORMHOLE5_RIM_FEATHER = hqDesktopProd ? 0.14 : 0.24;
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
        /** Scene {@link THREE.FogExp2} only affects materials with fog enabled (was false — slider had no effect). */
        fog: mode !== 1,
        /** Custom {@link THREE.ShaderMaterial} must merge {@link THREE.UniformsLib.fog} when `fog` is true — otherwise WebGLRenderer `refreshFogUniforms` reads undefined `.value`. */
        uniforms: THREE.UniformsUtils.merge([
          mode !== 1 ? THREE.UniformsLib.fog : {},
          {
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
            uHelixTubeVariant: { value: 0 },
            uHelixJuliaPattern: { value: 1 },
            uHelixJuliaPatternBloomMul: { value: 1 },
            uHelixJuliaInteriorBlur: { value: 0 },
            uHelixJuliaShimmer: { value: 0 },
            uHoleRadius: { value: initial.holeRadius },
            uRingCylLook: { value: mode === 0 ? devRingCylLook : 0 },
          },
        ]),
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
    const skySegW = tunnelQ.skySegW;
    const skySegH = tunnelQ.skySegH;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(220, skySegW, skySegH), skyMat);
    scene.add(sky);

    const starCount = tunnelQ.starCount;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
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
        sharedRingGeo = new THREE.RingGeometry(0.81, 1.0, ringSegsInversion, 1);
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
          const geo = new THREE.RingGeometry(
            initial.ringRadius * 0.81,
            initial.ringRadius,
            ringSegsClassic,
            1,
          );
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
      sharedRingGeo = new THREE.RingGeometry(0.81, 1.0, ringSegsInversion, 1);
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

    const homeHelixViewportMul = helixLabFullscreen
      ? WORMHOLE_HOME_HELIX_FULLSCREEN_WALL_MUL *
        (useRingGrowthInversion ? WORMHOLE_HOME_HELIX_RING_STACK_FILL_BOOST : 1)
      : null;

    if (introRingsOverlay) {
      const introCount =
        typeof window !== 'undefined' && isWormholeTouchScrollPrimary() ? 18 : 30;
      const introSpacing = initial.ringSpacing * 0.92;
      const introOuter =
        homeHelixViewportMul != null
          ? initial.ringRadius * hx.radialScale * homeHelixViewportMul
          : initial.ringRadius;
      const introInner = helixLabFullscreen ? introOuter * 0.81 : initial.ringRadius * 0.81;
      const introGeo = new THREE.RingGeometry(introInner, introOuter, ringSegsClassic, 1);
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
    let helixRibbonUsesJuliaShader = helixLab && initialHelixRibbonJuliaShader;
    const helixStrands = helixLab ? 3 : initial.helixCount;

    const helixWallInsetMul =
      homeHelixViewportMul ??
      (helixWallInsetMulProp !== undefined ? helixWallInsetMulProp : 0.88);

    const helixRimFeather = helixRibbonGradeWormhole5
      ? HELIX_WORMHOLE5_RIM_FEATHER
      : HELIX_RIM_FEATHER_DEV;
    const helixMatIntensity = helixRibbonGradeWormhole5 ? 1.26 : 1.05;
    const helixZoomNudge = helixRibbonGradeWormhole5 ? 0.06 : 0;
    const helixEdgeHaloMul = helixRibbonGradeWormhole5 ? HELIX_WORMHOLE5_EDGE_HALO_MUL : 1;

    const rebuildHelixGeometry = () => {
      const live = tunnelStore.getState();
      const helixQNow = resolveWormholeHelixQuality(live);
      const hxNow = {
        ...hxBase,
        tubeRadialSegs: helixQNow.tubeRadialSegs,
        ...(helixLab
          ? {
              tubeRadius: helixQNow.tubeRadius,
              twistTurns: helixQNow.twistTurns,
              radialScale: helixQNow.radialScale,
              wobbleAmp: helixQNow.wobbleAmp,
              wobbleFreq: helixQNow.wobbleFreq,
              opacity: helixQNow.opacity,
            }
          : {}),
      };

      const r0 = hxNow.tubeRadius;
      const R0 = (2 * r0) / Math.sqrt(3);
      const bundleOuter = R0 + r0;
      const targetWall = live.ringRadius * hxNow.radialScale * helixWallInsetMul;
      const bundleScale = helixLab ? targetWall / bundleOuter : 1;
      const helixTubeR = helixLab ? r0 * bundleScale : hxNow.tubeRadius;
      const helixPathR = (t01: number) => {
        if (helixLab) {
          return bundleScale * (R0 + Math.sin(t01 * hxNow.wobbleFreq) * hxNow.wobbleAmp * 0.28);
        }
        return (
          live.ringRadius * hxNow.radialScale +
          Math.sin(t01 * hxNow.wobbleFreq) * hxNow.wobbleAmp
        );
      };

      const useJuliaRibbonTube =
        helixLab &&
        (!localhostHelixLabRibbonToggle || live.wormholeHelixJuliaRibbonShaderEnabled);

      for (const mesh of helices) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      helices.length = 0;
      helixMats.length = 0;
      helixRibbonUsesJuliaShader = useJuliaRibbonTube;

      for (let h = 0; h < helixStrands; h++) {
        const phaseOffset = (h / helixStrands) * Math.PI * 2;
        const points: THREE.Vector3[] = [];
        const HELIX_PTS = helixQNow.pathPts;
        const HELIX_TWISTS = hxNow.twistTurns;
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
          hxNow.tubeRadialSegs,
          false,
        );
        const mat = useJuliaRibbonTube
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
              opacity: hxNow.opacity,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              toneMapped: false,
              fog: true,
              side: THREE.FrontSide,
            });
        if (useJuliaRibbonTube) helixMats.push(mat as THREE.ShaderMaterial);
        const mesh = new THREE.Mesh(tube, mat);
        mesh.userData.basePhase = phaseOffset;
        if (helixLab && (introRingsOverlay || helixLabFullscreen)) mesh.renderOrder = 50;
        helices.push(mesh);
        scene.add(mesh);
      }
    };

    rebuildHelixGeometry();

    let trackedHelixQualityRevision = tunnelStore.getState().wormholeHelixQualityRevision;
    const unsubHelixQuality = tunnelStore.subscribe(() => {
      const nextRev = tunnelStore.getState().wormholeHelixQualityRevision;
      if (nextRev === trackedHelixQualityRevision) return;
      trackedHelixQualityRevision = nextRev;
      rebuildHelixGeometry();
    });

    const replaceHelixRibbonMaterials = (useJulia: boolean) => {
      helixMats.length = 0;
      for (let h = 0; h < helices.length; h++) {
        const mesh = helices[h]!;
        (mesh.material as THREE.Material).dispose();
        const mat =
          useJulia
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
        if (useJulia) helixMats.push(mat as THREE.ShaderMaterial);
        mesh.material = mat;
      }
      helixRibbonUsesJuliaShader = useJulia;
    };

    let lastHelixJuliaRibbonFlag = initial.wormholeHelixJuliaRibbonShaderEnabled;
    const unsubHelixJuliaRibbon =
      localhostHelixLabRibbonToggle
        ? tunnelStore.subscribe(() => {
            const next = tunnelStore.getState().wormholeHelixJuliaRibbonShaderEnabled;
            if (next === lastHelixJuliaRibbonFlag) return;
            lastHelixJuliaRibbonFlag = next;
            if (next === helixRibbonUsesJuliaShader) return;
            replaceHelixRibbonMaterials(next);
          })
        : null;

    const tunnelParticleCount = tunnelQ.particleCount;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(tunnelParticleCount * 3);
    const pCol = new Float32Array(tunnelParticleCount * 3);
    const pPh = new Float32Array(tunnelParticleCount);
    /** ~50%: wave / shimmer motion layered on top of drift + slow swirl. */
    const pWave = new Float32Array(tunnelParticleCount);
    const particleSpreadMul = homeHelixViewportMul ?? 1;
    for (let i = 0; i < tunnelParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * initial.ringRadius * 0.95 * particleSpreadMul;
      const z = -Math.random() * TUNNEL_LENGTH;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = z;
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
      pCol[i * 3] = tint.r;
      pCol[i * 3 + 1] = tint.g;
      pCol[i * 3 + 2] = tint.b;
      pPh[i] = Math.random() * Math.PI * 2;
      pWave[i] = Math.random() < 0.5 ? 1 : 0;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('phase', new THREE.BufferAttribute(pPh, 1));
    pGeo.setAttribute('wave', new THREE.BufferAttribute(pWave, 1));
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
    const narrow0 = wormholeNarrowViewport();
    const helixMobileBloomMul0 = helixLab && narrow0 ? helixQ.effectiveMobileBloomMul : 1;
    const mobileBloomStrengthMul0 = narrow0 ? MOBILE_BLOOM_STRENGTH_MUL : 1;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      initial.bloomStrength * helixMobileBloomMul0 * mobileBloomStrengthMul0,
      initial.bloomRadius,
      initial.bloomThreshold,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    let resizePending = false;
    let resizeDebounceId: ReturnType<typeof setTimeout> | undefined;
    const applyResize = () => {
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
    const onResize = () => {
      if (isWormholeTouchScrollPrimary()) {
        if (resizeDebounceId !== undefined) clearTimeout(resizeDebounceId);
        resizeDebounceId = setTimeout(() => {
          resizeDebounceId = undefined;
          applyResize();
        }, 220);
        return;
      }
      applyResize();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (visualViewport) {
      visualViewport.addEventListener('resize', onResize);
    }

    /** `/wormhole3` — mouse aim + scroll velocity ride on the camera (throat only). */
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    /** Second pole on look-at — kills subpixel / irregular mouse-event jitter on desktop. */
    let lookLagX = 0;
    let lookLagY = 0;
    /** Low-pass on journey mouth easing so look target doesn’t step with depth noise (Chrome). */
    let mouseAimSm = 1;
    let velRideSm = 0;
    /**
     * `pointermove` + coalesced events: Chrome often bundles several mickeys between rAFs; averaging
     * yields a steadier normalized aim than reading only the last `mousemove`.
     */
    const onPointerMove = (e: PointerEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const coalesced =
        typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      const batch = coalesced.length > 0 ? coalesced : [e];
      let sx = 0;
      let sy = 0;
      for (const ev of batch) {
        sx += (ev.clientX / w) * 2 - 1;
        sy += -((ev.clientY / h) * 2 - 1);
      }
      ptr.x = sx / batch.length;
      ptr.y = sy / batch.length;
    };
    const pointerFine =
      typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    /** Wormhole6: mouse aim only on fine pointers (desktop); Wormhole3 path unchanged. */
    const attachMouseAimBase =
      useThroatCamera && (!journeyCameraFromStart || pointerFine);
    let pointerListenerOn = false;
    const syncPointerListener = () => {
      const parallaxOn =
        attachMouseAimBase &&
        journeyMouseParallaxMul(tunnelStore.getState().wormholeJourneyMouseParallax) > 0;
      if (parallaxOn && !pointerListenerOn) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        pointerListenerOn = true;
      } else if (!parallaxOn && pointerListenerOn) {
        window.removeEventListener('pointermove', onPointerMove);
        pointerListenerOn = false;
        ptr.x = 0;
        ptr.y = 0;
        ptr.sx = 0;
        ptr.sy = 0;
        lookLagX = 0;
        lookLagY = 0;
      }
    };
    syncPointerListener();
    const unsubPointerParallax = tunnelStore.subscribe(syncPointerListener);

    const clock = new THREE.Clock();
    let smoothedBank = 0;
    /** `/wormhole4` — `wormholeScrollHelixVelGain` couples helix twist to scroll velocity. */
    let helixVelStrafe = 0;
    /** Prod home (`helixWormhole2RibbonStyle`): extra twist like `/wormhole2` idle drift without touching tunnel depth (rings stay unchanged). */
    let helixWormhole2SynthTwist = 0;
    const randCamTilt = createRandomCamTiltRuntime();
    /** Low-pass journey depth + scroll vel — mouth FOV/dolly/fog do not step when reversing scroll after rings. */
    let journey01Sm = 0;
    let scrollVelSm = 0;
    let chromiumIdleSkipToggle = false;
    let raf = 0;
    const tick = () => {
      const s = tunnelStore.getState();
      if (s.wormholeTunnelRenderPaused) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const scrollCoasting = Math.abs(s.velocity) >= 0.08;
      const driftMoteWaveActive = isDriftMoteWaveActive(
        s.scrollInputIdle,
        s.velocity,
        s.wormholeDebugDriftMotesIdleBuzz,
      );
      const tunnelTrulyIdle =
        s.scrollInputIdle > 0.995 && Math.abs(s.velocity) < 0.06;
      const pointerParallaxOnEarly =
        journeyMouseParallaxMul(s.wormholeJourneyMouseParallax) > 0;
      if (
        !motionPrefs.reduced &&
        isChromiumDesktopBrowser() &&
        !pointerParallaxOnEarly &&
        tunnelTrulyIdle
      ) {
        chromiumIdleSkipToggle = !chromiumIdleSkipToggle;
        if (chromiumIdleSkipToggle) {
          raf = requestAnimationFrame(tick);
          return;
        }
      }

      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      let juliaTime = elapsed;
      if (s.wormholeDebugJuliaAmbientSync) {
        const audioT = getWormhole5AmbientPlaybackTime();
        if (audioT != null) {
          juliaTime = audioT * Math.max(0.05, s.wormholeDebugJuliaAmbientSyncRate);
        }
      }

      let eqIntensityMul = 1;
      let eqShimmerAdd = 0;
      if (s.wormholeDebugJuliaAmbientEqualizer) {
        const eq = tickWormholeAmbientEqualizer(dt);
        const k = THREE.MathUtils.clamp(s.wormholeDebugJuliaAmbientEqualizerStrength, 0, 2);
        eqIntensityMul = 1 + eq.rms * k * 1.45;
        eqShimmerAdd = eq.bass * k * 0.75 + eq.treble * k * 0.2;
        juliaTime += (eq.bass * k * 5.5 + eq.mid * k * 2) * dt;
        juliaTime += eq.treble * k * 0.035;
      }

      const time = elapsed;
      const zMul = tunnelZoomMul(s.zoomRate);
      const holeR = THREE.MathUtils.clamp(s.holeRadius, 0.1, 0.55);
      const maxDepthForJourney = Math.max(1, s.maxDepth);
      const journey01 = useThroatCamera
        ? THREE.MathUtils.clamp(s.depth / maxDepthForJourney, 0, 1)
        : 0;
      const touchScrollPrimary = isWormholeTouchScrollPrimary();
      if (useThroatCamera) {
        const journey01Rate = touchScrollPrimary ? 11.5 : 7.5;
        journey01Sm += (journey01 - journey01Sm) * (1 - Math.exp(-dt * journey01Rate));
        scrollVelSm += (s.velocity - scrollVelSm) * (1 - Math.exp(-dt * (touchScrollPrimary ? 14 : 11)));
      } else {
        journey01Sm = 0;
        scrollVelSm = 0;
      }
      const journeyMouth = useThroatCamera ? journey01Sm : journey01;
      const exitB = useThroatCamera ? throatExitBlend(journeyMouth) : 0;
      const introB = useThroatCamera ? throatIntroBlend(journeyMouth) : 0;
      /** Softer ring→helix / exit bloom on touch — less of a one-frame GPU cliff at journey end. */
      const exitBEff = touchScrollPrimary ? exitB * 0.62 : exitB;

      /**
       * `/wormhole5` (helix lab + intro rings + journey): at the mouth, use the same framing as
       * `/wormhole2` (camera at z≈0, base FOV). Journey pull-back / wide FOV eases in after a
       * short depth so ribbons stay full-screen at the start.
       * `/wormhole6` sets `journeyCameraFromStart` to match `/wormhole3` throat from frame 0.
       */
      const journeyCamEasing = journeyCameraFromStart
        ? 1
        : helixLab && introRingsOverlay && throatCameraJourney
          ? THREE.MathUtils.smoothstep(0, 0.012, journeyMouth)
          : 1;
      /**
       * Mouth framing ramps FOV/dolly via `journeyCamEasing`, but that also scaled mouse `lookAt` to 0 at
       * depth 0 (`/wormhole5`, `/wormhole7`, `/wormhole10`). Keep pointer aim fully active while the
       * journey pull-back eases in.
       */
      const mouseAimEasing =
        helixLab && introRingsOverlay && throatCameraJourney && !journeyCameraFromStart
          ? 1
          : journeyCamEasing;
      const rawIntroCam = THREE.MathUtils.clamp(s.wormholeHomeIntroCam01 ?? 1, 0, 1);
      const homeIntroCamMul =
        openingJourneyCameraIntro && !journeyCameraFromStart
          ? THREE.MathUtils.lerp(OPENING_JOURNEY_INTRO_BASE_FRAC, 1, rawIntroCam)
          : journeyCameraFromStart || openingJourneyCameraIntro
            ? rawIntroCam
            : 1;
      let journeyFovAdd =
        (useThroatCamera ? throatJourneyFovAdd(journeyMouth) : 0) * journeyCamEasing * homeIntroCamMul;
      let journeyCamZAdd =
        (useThroatCamera ? throatJourneyCamZ(journeyMouth) : 0) *
        journeyCamEasing *
        homeIntroCamMul;
      if (touchScrollPrimary && useThroatCamera) {
        journeyFovAdd = Math.min(journeyFovAdd, WORMHOLE_MOBILE_MOUTH_FOV_ADD_CAP);
        const zCap = WORMHOLE_MOBILE_MOUTH_CAM_Z_CAP;
        if (Math.abs(journeyCamZAdd) > zCap) {
          journeyCamZAdd = Math.sign(journeyCamZAdd) * zCap;
        }
      }

      journeyFovAdd *= zMul;
      journeyCamZAdd *= zMul;

      const parallaxMul = journeyMouseParallaxMul(s.wormholeJourneyMouseParallax);
      const pointerParallaxOn = parallaxMul > 0;

      if (useThroatCamera) {
        if (pointerParallaxOn && (!journeyCameraFromStart || pointerFine)) {
          const errX = ptr.x - ptr.sx;
          const errY = ptr.y - ptr.sy;
          const errMag = Math.hypot(errX, errY);
          const moveBlend = THREE.MathUtils.smoothstep(errMag, 0.0035, 0.12);
          const ptrLambda = THREE.MathUtils.lerp(2.9, 8.2, moveBlend);
          let ptrEase = 1 - Math.exp(-dt * ptrLambda);
          ptrEase = Math.min(ptrEase, 0.3);
          ptr.sx += errX * ptrEase;
          ptr.sy += errY * ptrEase;
        }
        const introRideRamp = THREE.MathUtils.smoothstep(0, THROAT_INTRO_FRAC * 0.55, journeyMouth);
        const rideTarget = THREE.MathUtils.clamp(
          -scrollVelSm * 0.46 * introRideRamp,
          -2.65,
          2.65,
        );
        velRideSm += (rideTarget - velRideSm) * (1 - Math.exp(-dt * 6.8));
      } else {
        velRideSm += -velRideSm * (1 - Math.exp(-dt * 4));
      }

      let aimX = 0;
      let aimY = 0;
      if (pointerParallaxOn) {
        mouseAimSm += (mouseAimEasing - mouseAimSm) * (1 - Math.exp(-dt * 5.2));
        /**
         * Smooth in **full** parallax space, then scale for subtle (`journeyMouseParallaxMul` 0.42). If we
         * scale ptr before this loop, `lookErr` is tiny in subtle mode: `lookLambda` sits in the slow
         * band and flips with subpixel pointer noise — visible jitter. Full mode was unaffected.
         */
        const lookTxFull = useThroatCamera ? ptr.sx * 0.64 * mouseAimSm : 0;
        const lookTyFull = useThroatCamera ? ptr.sy * 0.42 * mouseAimSm : 0;
        const lookErr = Math.hypot(lookTxFull - lookLagX, lookTyFull - lookLagY);
        const lookBlend = THREE.MathUtils.smoothstep(lookErr, 0.0009, 0.052);
        const lookLambda = THREE.MathUtils.lerp(2.35, 6.6, lookBlend);
        let lookOutEase = 1 - Math.exp(-dt * lookLambda);
        lookOutEase = Math.min(lookOutEase, 0.26);
        lookLagX += (lookTxFull - lookLagX) * lookOutEase;
        lookLagY += (lookTyFull - lookLagY) * lookOutEase;
        aimX = lookLagX * parallaxMul;
        aimY = lookLagY * parallaxMul;
      } else {
        lookLagX = 0;
        lookLagY = 0;
      }

      if (helixWormhole2RibbonStyle && helixLab) {
        helixWormhole2SynthTwist += dt * 0.48;
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

          if (fade < 0.012) {
            ring.visible = false;
            mat.uniforms.uScrollFade.value = 0;
            mat.uniforms.uIntensity.value = 0;
            continue;
          }
          ring.visible = true;
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

        const ringVis = scrollFade * fadeIn * fadeOut;
        if (ringVis < 0.012) {
          ring.visible = false;
          mat.uniforms.uScrollFade.value = 0;
          mat.uniforms.uIntensity.value = 0;
        } else {
          ring.visible = true;
          mat.uniforms.uScrollFade.value = scrollFade;
          const baseIntensity = (ring.userData.baseRingIntensity as number) ?? 1;
          const throatBoost = throat && !helixLab ? 1.1 : 1;
          const exitRingDim = throat ? 1 - exitBEff * 0.4 : 1;
          mat.uniforms.uIntensity.value =
            baseIntensity * fadeIn * fadeOut * throatBoost * exitRingDim * eqIntensityMul;
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
      }

      if (introRingsOverlay) {
        const introFadeOutStart = touchScrollPrimary ? 96 : 88;
        const introFadeOutEnd = touchScrollPrimary ? 215 : 170;
        /** Mouth-only stack — hide after home intro cam finishes so rings do not ghost on the radial bg. */
        const introMouthRevealActive =
          !openingJourneyCameraIntro || (s.wormholeHomeIntroCam01 ?? 1) < 0.94;
        for (let ri = 0; ri < introRings.length; ri++) {
          const ring = introRings[ri]!;
          const mat = introRingMats[ri]!;
          const relZ = ring.position.z + s.depth;
          const distAhead = -relZ;
          const fadeIn = smoothstep(-2, 5, distAhead);
          const fadeOut = 1 - smoothstep(introFadeOutStart, introFadeOutEnd, distAhead);
          const introFade = fadeIn * fadeOut;
          if (!introMouthRevealActive || introFade < 0.012) {
            ring.visible = false;
            mat.uniforms.uScrollFade.value = 0;
            mat.uniforms.uIntensity.value = 0;
            continue;
          }
          ring.visible = true;
          mat.uniforms.uScrollFade.value = introFade;
          mat.uniforms.uIntensity.value = introFade * 1.05 * eqIntensityMul;
          mat.uniforms.uDistAhead.value = Math.max(0, distAhead);
          mat.uniforms.uTime.value = juliaTime;
          mat.uniforms.uDepth.value = s.depth;
          mat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
          mat.uniforms.uDiscRadius.value = s.discRadius;
          mat.uniforms.uHoleRadius.value = holeR;
          ring.rotation.z += ((ring.userData.spin as number) + s.velocity * 0.04) * dt;
        }
      }

      for (const m of ringMats) {
        m.uniforms.uTime.value = juliaTime;
        m.uniforms.uDepth.value = s.depth;
        m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        m.uniforms.uDiscRadius.value = s.discRadius;
        m.uniforms.uHoleRadius.value = holeR;
      }
      if (skyJulia) {
        skyJulia.uniforms.uTime.value = juliaTime * 0.4;
        skyJulia.uniforms.uDepth.value = s.depth * 0.05;
        skyJulia.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        skyJulia.uniforms.uDiscRadius.value = s.discRadius;
        if (useThroatCamera) {
          skyJulia.uniforms.uIntensity.value =
            0.4 * (1 + introB * 0.35 + exitBEff * 1.15) * eqIntensityMul;
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
      const helixBase = helixRibbonGradeWormhole5
        ? 0.9
        : helixLab && useRingGrowthInversion
          ? 0.765
          : 0.72;
      const helixOpacityBoost = helixRibbonGradeWormhole5 ? 1.12 : 1;

      if (helixShow && helixRibbonUsesJuliaShader) {
        for (let hi = 0; hi < helixMats.length; hi++) {
          const hm = helixMats[hi]!;
          hm.uniforms.uTime.value = juliaTime;
          hm.uniforms.uDepth.value = s.depth;
          hm.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
          hm.uniforms.uDiscRadius.value = s.discRadius;
          hm.uniforms.uHoleRadius.value = holeR;
          hm.uniforms.uDistAhead.value = helixDistAhead;
          hm.uniforms.uScrollFade.value = 1;
          hm.uniforms.uIntensity.value =
            (helixBase + velFlare) *
            helixFadeIn *
            helixFadeOut *
            resolveWormholeHelixQuality(s).opacity *
            helixOpacityBoost *
            eqIntensityMul;
          hm.uniforms.uHelixTubeVariant.value = s.wormholeHelixTubeVariant;
          hm.uniforms.uHelixJuliaPattern.value = s.wormholeHelixTubeJuliaPatternEnabled ? 1 : 0;
          hm.uniforms.uHelixJuliaPatternBloomMul.value = Math.max(
            0.05,
            s.wormholeHelixJuliaPatternBloomMul * (0.85 + eqIntensityMul * 0.15),
          );
          hm.uniforms.uHelixJuliaInteriorBlur.value = THREE.MathUtils.clamp(
            s.wormholeHelixJuliaInteriorBlur,
            0,
            1,
          );
          hm.uniforms.uHelixJuliaShimmer.value = THREE.MathUtils.clamp(
            s.wormholeHelixJuliaShimmer + eqShimmerAdd,
            0,
            1,
          );
        }
      }

      for (const h of helices) {
        h.visible = helixShow;
        if (!helixShow) continue;
        const helixSpinT = helixWormhole2RibbonStyle ? 0.255 : 0.18;
        h.rotation.z =
          time * helixSpinT +
          (h.userData.basePhase as number) * 0.3 +
          s.depth * 0.04 +
          helixVelStrafe +
          (helixWormhole2RibbonStyle ? helixWormhole2SynthTwist : 0);
        if (!helixLab || !helixRibbonUsesJuliaShader) {
          const hm = h.material as THREE.MeshBasicMaterial;
          const flare = Math.min(Math.abs(s.velocity) * 0.08, 0.35);
          let op = 0.85 + flare;
          if (useThroatCamera) op *= 1 - exitBEff * 0.58;
          hm.opacity = op;
        }
      }

      const positions = pGeo.attributes.position!.array as Float32Array;
      const phases = pGeo.attributes.phase!.array as Float32Array;
      const waveSel = pGeo.attributes.wave!.array as Float32Array;
      const dz = s.velocity * dt * DRIFT_MOTE_PHYSICS.zVelMul;
      const ringR = Math.max(0.5, s.ringRadius);
      const waveAmp = driftMoteWaveAmp(ringR);
      for (let i = 0; i < tunnelParticleCount; i++) {
        positions[i * 3 + 2] += dz;
        if (positions[i * 3 + 2] > 5) positions[i * 3 + 2] -= TUNNEL_LENGTH;
        else if (positions[i * 3 + 2] < -TUNNEL_LENGTH + 5) positions[i * 3 + 2] += TUNNEL_LENGTH;
        const x = positions[i * 3]!;
        const y = positions[i * 3 + 1]!;
        const angSpeed =
          DRIFT_MOTE_PHYSICS.angSpeedBase + phases[i]! * DRIFT_MOTE_PHYSICS.angSpeedPhaseMul;
        const cs = Math.cos(angSpeed * dt);
        const sn = Math.sin(angSpeed * dt);
        positions[i * 3] = x * cs - y * sn;
        positions[i * 3 + 1] = x * sn + y * cs;
        if (!motionPrefs.reduced && driftMoteWaveActive && waveSel[i]! > 0.5) {
          const rz = positions[i * 3 + 2]!;
          const ph = phases[i]!;
          const w = driftMoteWaveSample(time, ph, rz);
          positions[i * 3] += w.slow * waveAmp * DRIFT_MOTE_PHYSICS.slowXYMul * w.pulse;
          positions[i * 3 + 1] += w.fast * waveAmp * w.pulse;
        }
      }
      pGeo.attributes.position!.needsUpdate = true;

      if (s.wormhole5CoinDriftMoteLiveParticleReflectionEnabled) {
        const pCol = pGeo.attributes.color!.array as Float32Array;
        publishLiveDriftMoteParticleSamples(positions, pCol, tunnelParticleCount, ringR);
      }

      stars.rotation.z = time * 0.005;
      if (useThroatCamera) {
        const sm = stars.material as THREE.PointsMaterial;
        sm.opacity = 0.7 * (1 - introB * 0.28 + exitBEff * 0.22);
      }

      const narrow = wormholeNarrowViewport();
      const helixMobileBloomMul = helixLab && narrow
        ? resolveWormholeHelixQuality(s).effectiveMobileBloomMul
        : 1;
      const mobileBloomStrengthMul = narrow
        ? touchScrollPrimary
          ? 0.9
          : MOBILE_BLOOM_STRENGTH_MUL
        : 1;
      bloomPass.strength =
        s.bloomStrength *
        helixMobileBloomMul *
        mobileBloomStrengthMul *
        (useThroatCamera ? 1 + exitBEff * 0.14 : 1);
      bloomPass.radius = s.bloomRadius;
      bloomPass.threshold = s.bloomThreshold;

      if (scene.fog instanceof THREE.FogExp2) {
        let fd = s.fogDensity;
        if (useThroatCamera) {
          let introFog = introB;
          if (helixLab && throatCameraJourney && (introRingsOverlay || journeyCameraFromStart)) {
            introFog *= 0.42;
          }
          fd *= 1 - introFog * 0.42;
          fd *= 1 - exitBEff * 0.55;
        }
        scene.fog.density = fd;
      }

      if (!motionPrefs.reduced) {
        // ── Camera "going through the tunnel" effects ──
        // All three are subtle — additive on top of the wall flow, not replacing it.

        // 1. Velocity-driven FOV breathing — speed lines / hyperspace lens stretch.
        //    Faster scroll = wider FOV (warps periphery inward).
        const camVel = touchScrollPrimary ? scrollVelSm : s.velocity;
        const coinFollow = computeWormholeCoinFollowCam({
          enabled: s.wormholeCoinFollowCamEnabled && useThroatCamera,
          strength: s.wormholeCoinFollowCamStrength,
          depth: s.depth,
          maxDepth: maxDepthForJourney,
          velocity: camVel,
        });
        const velFovMul = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_FOV_MUL : 0.65;
        const velFovCap = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_FOV_CAP : 8;
        const velDollyMul = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_DOLLY_MUL : 0.16;
        const velDollyCap = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_DOLLY_CAP : 1;
        const baseFov = 72 + journeyFovAdd + coinFollow.fovAdd;
        const targetFov = baseFov + Math.min(Math.abs(camVel) * velFovMul, velFovCap);
        const fovEase = 1 - Math.exp(-dt * (touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_FOV_EASE : 6));
        camera.fov += (targetFov - camera.fov) * fovEase;
        if (Math.abs(camera.fov - targetFov) > 0.04) {
          camera.updateProjectionMatrix();
        }

        // 2. Forward dolly with elastic recoil — camera lurches forward on velocity
        //    bursts then springs back to z=0. Reads as "weight" inside the tube.
        const dollyTarget = -Math.min(Math.abs(camVel) * velDollyMul, velDollyCap);
        const scrollRideZ = useThroatCamera ? velRideSm * journeyCamEasing : 0;
        const targetZ = dollyTarget + journeyCamZAdd + scrollRideZ + coinFollow.dollyZ;
        const dollyEase = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_DOLLY_EASE : 4;
        camera.position.z += (targetZ - camera.position.z) * (1 - Math.exp(-dt * dollyEase));

        // 3. High-frequency wobble — off (was velocity × sin; felt too busy while scrolling).
        camera.position.x = 0;
        camera.position.y = 0;

        // 4. Slight roll banking — when scrolling hard, the camera banks like a plane.
        //    Direction matches velocity sign so reverse scroll banks the other way.
        const bankMul = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_BANK_MUL : 0.005;
        const bankCap = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_BANK_CAP : 0.032;
        const bankTarget = -Math.sign(camVel) * Math.min(Math.abs(camVel) * bankMul, bankCap);
        const bankEase = touchScrollPrimary ? WORMHOLE_MOBILE_CAM_VEL_BANK_EASE : 3;
        smoothedBank += (bankTarget - smoothedBank) * (1 - Math.exp(-dt * bankEase));

        // Re-aim camera down the tube (shake displaced position, but lookAt restores aim).
        // Roll is applied after lookAt so banking is not cleared.
        camera.lookAt(aimX, aimY, -10);
        camera.rotateZ(smoothedBank);

        applyRandomCamTiltAfterLookAt(
          camera,
          s.wormholeDebugRandomCamTilt,
          s.wormholeDebugRandomCamTiltAmount,
          touchScrollPrimary ? scrollVelSm : s.velocity,
          s.depth,
          randCamTilt,
          dt,
        );

        if (s.wormholeDebugCircularCamTilt) {
          const ph = time * 0.26;
          camera.rotateX(Math.cos(ph) * 0.013);
          camera.rotateY(Math.sin(ph) * 0.011);
        }
      } else {
        smoothedBank = 0;
        if (useThroatCamera) {
          const coinFollowReduced = computeWormholeCoinFollowCam({
            enabled: s.wormholeCoinFollowCamEnabled && useThroatCamera,
            strength: s.wormholeCoinFollowCamStrength,
            depth: s.depth,
            maxDepth: maxDepthForJourney,
            velocity: 0,
          });
          camera.fov = 72 + journeyFovAdd + coinFollowReduced.fovAdd;
          camera.position.set(
            0,
            0,
            journeyCamZAdd + velRideSm * journeyCamEasing + coinFollowReduced.dollyZ,
          );
          camera.updateProjectionMatrix();
        } else {
          camera.fov = 72;
          camera.updateProjectionMatrix();
          camera.position.set(0, 0, 0);
        }
        camera.lookAt(aimX, aimY, -10);
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
      if (resizeDebounceId !== undefined) clearTimeout(resizeDebounceId);
      unsubHelixQuality();
      unsubHelixJuliaRibbon?.();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', onResize);
      }
      unsubPointerParallax();
      if (pointerListenerOn) window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVis);
      clearLiveDriftMoteParticleSamples();
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
    openingJourneyCameraIntro,
    helixLabFullscreen,
    helixWallInsetMulProp,
    helixWormhole2RibbonStyle,
    tunnelQualityRevision,
  ]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen"
      aria-hidden
    />
  );
}
