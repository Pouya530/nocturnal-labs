'use client';

import '@/core/r3fDevSuppressClockWarn';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import * as THREE from 'three';
import { motionPrefs } from '@/core/motion';
import {
  getActiveLandingBackdropMode,
  subscribeActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import {
  webglCoinAntialias,
  webglCoinCanvasDpr,
  webglPowerPreference,
} from '@/lib/webglMobilePrefs';
import { getWormholeFallMotionSnapshot } from '@/components/wormhole/wormholeFallMotionBridge';
import { WORMHOLE_LAB_COIN_CANVAS_PERCENT } from '@/lib/wormholePageConfig';
import { isWormholeTouchScrollPrimary } from '@/lib/wormholeScrollMobile';
import { tunnelStore } from '@/tunnel/tunnelStore';

/** Place assets in `public/brand/` (front: Latin motto, back: alternate wordmark). Full-size backups: `*.original.png` next to each active file. */
const FACE_SRC_FRONT = '/brand/updated-latin-motto.png';
const FACE_SRC_BACK = '/brand/nocturnal-labs-logo-alt.png';

/**
 * Slight UV zoom (center crop) so the art inside the coin face extends closer to
 * the edge and the black ring in the bitmap reads as a thinner border.
 */
const LOGO_TEXTURE_FACE_ZOOM = 1.1;
/** Positive value moves the face artwork slightly downward within the coin. */
const LOGO_TEXTURE_FACE_Y_NUDGE = 0.018;

/** Map × color; includes prior boosts, +25% vs last pass. */
const LOGO_FACE_BRIGHTNESS = 1.3 * 1.25;
const LOGO_FACE_COLOR = new THREE.Color(
  LOGO_FACE_BRIGHTNESS,
  LOGO_FACE_BRIGHTNESS,
  LOGO_FACE_BRIGHTNESS,
);

/** Tighter highlights / rim response; +25% vs last pass. */
const SHINE = 1.25 * 1.25;
const FACE_METALNESS = 0.08 * SHINE;
const FACE_ROUGHNESS = 0.32 / SHINE;
const RIM_METALNESS = 0.55 * SHINE;
const RIM_ROUGHNESS = 0.38 / SHINE;
const RIM_EMISSIVE_BASE = 0.95 * SHINE;
const RIM_EMISSIVE_WAVE = 0.38 * SHINE;

/** Rim cylinder: gunmetal-grey base; emissive = pastel iridescence (blue/lavender-grey mix). */
const RIM_DIFFUSE_HEX = '#343942';
const RIM_EMISSIVE_INITIAL_HEX = '#9ca3b5';

/** Matches `<Canvas camera={{ position: [0, 0.08, 3.92], ... }} />`. */
const CAM_BASE_X = 0;
const CAM_BASE_Y = 0.08;
const CAM_BASE_Z = 3.92;
const CAM_BASE_FOV = 33.5;
/**
 * While `wormholeHomeIntroCam01` ramps (wormhole micro-intro), pull the coin GL camera back slightly;
 * weighted by `(1 - t)` so framing returns to baseline when the ramp hits 1 (store does not reset).
 */
const CAM_MICRO_INTRO_PULL_Z = 0.4;
const CAM_MICRO_INTRO_FOV = 2.35;
/** Wormhole: max extra Z pull-back / FOV widen at high scroll speed (velocity magnitude). */
const CAM_SCROLL_Z_PULL = 2.35;
const CAM_SCROLL_FOV_EXTRA = 7;
const CAM_SCROLL_V_REF = 95;
/** `useScrollDepth` locked branch scales wheel impulse ×0.35 — match coin camera zoom to free-mode feel. */
const CAM_SCROLL_LOCKED_VEL_SCALE = 2.85;
/** Locked: scroll down (v+) — stronger zoom-out than free-mode symmetric curve. */
const CAM_SCROLL_LOCKED_Z_PULL_DOWN = 4.35;
const CAM_SCROLL_LOCKED_FOV_DOWN = 13.2;
/** Locked: scroll up (v−) — dolly in + narrower FOV (“zoom in”). */
const CAM_SCROLL_LOCKED_Z_PUSH_UP = 1.42;
const CAM_SCROLL_LOCKED_FOV_UP = 6.35;
const CAM_SCROLL_LOCKED_FOV_MIN = 22;
/**
 * Locked: extra dolly / FOV from scroll **speed** (|v|), both directions — coin reads smaller at
 * high speed; this pulls the camera farther back so framing matches.
 */
const CAM_SCROLL_LOCKED_Z_SPEED_AWAY = 0.92;
const CAM_SCROLL_LOCKED_FOV_SPEED_AWAY = 3.1;
/** Locked backward zoom-in: 0 at mouth → full by this fraction of `maxDepth` (eases scroll-back clip). */
const CAM_SCROLL_LOCKED_BACK_ZOOM_IN_DEPTH_FRAC = 0.045;
/**
 * Locked mode: blend forward vs backward scroll camera curves across `v≈0` so tiny velocity noise
 * does not snap between branches (visible coin jitter next to parallax / coast).
 */
const CAM_SCROLL_V_SIGN_BLEND = 22;
/** Signed scroll vel smoothing for forward vs backward camera branches (wider = less flip at v≈0). */
const CAM_SCROLL_SIGNED_VEL_SMOOTH = 14;
/** Low-pass on shallow-depth zoom-in so mouth re-entry while scrolling up does not hitch. */
const CAM_SCROLL_SHALLOW_SMOOTH = 12;

/** Rim shimmer / point-light orbit: ramp phase speed only at very high tunnel scroll velocity. */
const REFLECT_SCROLL_V_START = 48;
const REFLECT_SCROLL_V_END = 108;
/** Extra phase multiplier at max velocity (1 + this ≈ peak vs idle). */
const REFLECT_PHASE_MUL_EXTRA = 5.5;

/**
 * Julia wormhole helix strand accent colours (matches {@link JuliaWormholeBackdrop} PALETTE order —
 * used for `/wormhole5` coin “ribbon reflection” point lights only).
 */
const HELIX_RIBBON_REFLECTION_HEX = [0xff4da8, 0x8e3bff, 0x3b7bff] as const;
const HELIX_REFLECT_ORBIT_R = 2.06;
const HELIX_REFLECT_TWIST_TURNS = 2.28;

/** Tangent to gunmetal **edge** (cylinder): in-plane orbit just outside r=1 for specular rim streaks. */
const RIM_TANGENT_RING_R = 1.075;

/**
 * Tunnel-debug: **full-disc** emissive on front/back when that face’s world normal aligns with the
 * camera look direction (bright GL tunnel lies **past** the coin along that ray). Strength / falloff
 * below; direction comes from {@link THREE.Camera.getWorldDirection} each frame.
 */
const BACKDROP_FACE_EMISSIVE_MAX = 3.35;
/** `smoothstep` on clamped dot — wide so most “into tunnel” angles hit **full** uniform emissive. */
const BACKDROP_FACE_DOT_LO = 0;
const BACKDROP_FACE_DOT_HI = 0.52;
const BACKDROP_FACE_EMISSIVE_COLOR = new THREE.Color('#f4f9ff');

/** Scroll-sync Y spin: exponential approach toward target rad/s (responsive during sustained scroll). */
const SPIN_RATE_SMOOTH_LAMBDA = 13;
/**
 * Softer approach after hands leave idle (`scrollInputIdle` was high) — eases out of fall drift into
 * steady vertical spin without snapping to full boost immediately.
 */
const SPIN_RATE_SMOOTH_LAMBDA_SOFT = 3.6;
/** Seconds after idle→scroll where {@link SPIN_RATE_SMOOTH_LAMBDA_SOFT} applies. */
const SPIN_SOFT_ENTRY_HOLD_SEC = 0.55;

/** How each rim point-light moves in space (highlights sweep instead of only pulsing). */
type RimLightMotion = 'orbit' | 'vertical' | 'diagDown' | 'diagUp';

/** Per coin mount: randomise rim / point-light reflection phases & rates (see `reflectDna` in `CoinMesh`). */
function makeReflectDna() {
  const pi2 = Math.PI * 2;
  const ph = () => Math.random() * pi2;
  const hz = () => 0.86 + Math.random() * 0.26;
  /** Cycle motions so highlights aren’t all the same axis (vertical / both diagonals / orbit). */
  const motionCycle: RimLightMotion[] = [
    'vertical',
    'diagDown',
    'diagUp',
    'orbit',
    'vertical',
    'diagDown',
    'orbit',
  ];
  return {
    hueSkew: (Math.random() - 0.5) * 0.26,
    rimWaveHz: hz(),
    rimWavePh: ph(),
    vortexHueSkew: (Math.random() - 0.5) * 0.2,
    vortexRimHz: hz(),
    vortexRimPh: ph(),
    vortexWaveHz: hz(),
    vortexWavePh: ph(),
    /** Rim lights A–G: phase, frequency mul, hue skew + varied spatial paths for reflection direction. */
    lights: Array.from({ length: 7 }, (_, i) => ({
      ph: ph(),
      hz: hz(),
      hueSkew: (Math.random() - 0.5) * 0.16,
      motion: motionCycle[i]!,
      baseAz: ph(),
      pathAmp: 0.52 + Math.random() * 0.38,
      pathSpeed: 0.72 + Math.random() * 0.48,
      orbitRate: (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.11),
      /** Secondary wobble so paths aren’t perfectly periodic. */
      wobbleHz: 0.31 + Math.random() * 0.22,
      wobblePh: ph(),
    })),
  };
}

type ReflectDna = ReturnType<typeof makeReflectDna>;

/** Radius for main rim highlight lights orbiting the coin (world units). */
const RIM_LIGHT_ORBIT_R = 2.38;
/** Tighter radius so lights graze the cylinder **side** (edge metal), not only from afar. */
const RIM_EDGE_GRAZE_R = 1.29;

type RimLightDna = ReflectDna['lights'][number];

/** World-space position for a rim highlight — vertical / diagonal / orbital sweeps (less uniform glints). */
function setRimLightWorldPosition(
  L: RimLightDna,
  rt: number,
  out: THREE.Vector3,
  orbitRadius: number = RIM_LIGHT_ORBIT_R,
): void {
  const R = orbitRadius;
  const w = rt * L.pathSpeed;
  const m = L.motion;
  const wobble = 0.065 * Math.sin(rt * L.wobbleHz + L.wobblePh);
  /** Slow azimuth drift so vertical/diagonal paths aren’t locked to one rim longitude. */
  const azDrift = L.baseAz + L.orbitRate * rt * 0.42 + wobble;

  if (m === 'vertical') {
    const y = L.pathAmp * 1.3 * Math.sin(w * L.hz + L.ph);
    const azThin = 0.095 * Math.sin(w * 0.44 + L.wobblePh * 0.6);
    const az = azDrift + azThin;
    out.set(R * Math.cos(az), y, R * Math.sin(az));
    return;
  }

  if (m === 'diagDown') {
    const s = Math.sin(w * L.hz + L.ph);
    const k = 0.707;
    const az = azDrift;
    out.set(
      R * Math.cos(az) + L.pathAmp * s * k,
      L.pathAmp * s * -k,
      R * Math.sin(az) + L.pathAmp * s * 0.26,
    );
    return;
  }

  if (m === 'diagUp') {
    const s = Math.sin(w * L.hz + L.ph + 1.07);
    const k = 0.707;
    const az = azDrift;
    out.set(
      R * Math.cos(az) + L.pathAmp * s * k,
      L.pathAmp * s * k,
      R * Math.sin(az) - L.pathAmp * s * 0.23,
    );
    return;
  }

  const a = azDrift + rt * L.orbitRate * 2.05;
  out.set(R * Math.cos(a), 0.4 * Math.sin(w * 0.63 + L.ph * 0.65), R * Math.sin(a));
}

/** Cheap quasi-noise for subtle glints (deterministic, no extra RNG per frame). */
function reflectChaos(rt: number, seed: number): number {
  return Math.sin(rt * 2.71 + seed) * Math.sin(rt * 1.13 + seed * 0.7) * Math.cos(rt * 0.47 + seed * 1.3);
}

/** Procedural reeded gunmetal for the coin edge (cylinder side UVs: u = around rim, v = across thickness). */
function createCoinRimSideTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 56;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('LogoCoin: rim texture 2d context unavailable');

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#454c5a');
  g.addColorStop(0.5, '#2c3038');
  g.addColorStop(1, '#3a4050');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.5;
  for (let x = 0; x < w; x += 3) {
    const a = x % 15 === 0 ? 0.22 : 0.1;
    ctx.fillStyle = `rgba(12,14,18,${a})`;
    ctx.fillRect(x, 0, 2, h);
  }
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? '#c8d0e0' : '#080a0c';
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Match `logo-coin-lift-*` CSS animation duration. */
const TOSS_DURATION_SEC = 1.5;
/** Match CSS keyframes: 0 → 1.5turn @ 50% → 3turn (linear), i.e. 3 full X flips in world space. */
const TOSS_FLIP_RADIANS = 3 * Math.PI * 2;

type CoinMeshProps = {
  spin: boolean;
  /** Increment on each toss to start in-scene X flip (shows both coin faces). */
  tossToken: number;
  /** When true, Y spin speed + direction follow `tunnelStore.velocity` (wormhole scroll). */
  spinSyncScroll?: boolean;
  /** Fires once after textures resolve and mesh commits (for entrance fade). */
  onLoaded?: () => void;
};

function layoutFaceTexture(tex: THREE.Texture) {
  const z = LOGO_TEXTURE_FACE_ZOOM;
  const invZ = 1 / z;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  if (z > 1) {
    tex.repeat.set(invZ, invZ);
    tex.offset.set(0.5 * (1 - invZ), 0.5 * (1 - invZ) + LOGO_TEXTURE_FACE_Y_NUDGE);
  } else {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }
  tex.needsUpdate = true;
}

function resetFaceTextureLayout(tex: THREE.Texture) {
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  tex.needsUpdate = true;
}

/**
 * Dolly + FOV from scroll `velocity`; decay follows tunnel friction so the shot eases back as
 * speed drops. Camera stays centered on X (no lateral strafe from scroll).
 */
function ScrollVelocityCamera({ enabled }: { enabled: boolean }): null {
  const { camera } = useThree();
  const smoothAbsVelRef = useRef(0);
  const signedVelSmRef = useRef(0);
  const shallow01SmRef = useRef(0);

  useFrame((_, delta) => {
    const persp = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.exp(-16 * dt);
    const velSmooth = 1 - Math.exp(-dt * 11);

    if (!enabled) {
      smoothAbsVelRef.current += (0 - smoothAbsVelRef.current) * velSmooth;
      signedVelSmRef.current += (0 - signedVelSmRef.current) * velSmooth;
      shallow01SmRef.current += (0 - shallow01SmRef.current) * velSmooth;
      persp.position.x += (CAM_BASE_X - persp.position.x) * ease;
      persp.position.y = CAM_BASE_Y;
      persp.position.z += (CAM_BASE_Z - persp.position.z) * ease;
      persp.fov += (CAM_BASE_FOV - persp.fov) * ease;
      persp.updateProjectionMatrix();
      return;
    }

    const s = tunnelStore.getState();
    const v = s.velocity;
    const touchScroll = isWormholeTouchScrollPrimary();
    const camVelMul = s.mode === 'locked' ? CAM_SCROLL_LOCKED_VEL_SCALE : 1;
    const signedVel = v * camVelMul;
    const signedVelSmooth = 1 - Math.exp(-delta * (touchScroll ? 20 : CAM_SCROLL_SIGNED_VEL_SMOOTH));
    signedVelSmRef.current += (signedVel - signedVelSmRef.current) * signedVelSmooth;
    const av = Math.abs(signedVelSmRef.current);
    smoothAbsVelRef.current += (av - smoothAbsVelRef.current) * velSmooth;
    const speedNorm = Math.min(1, smoothAbsVelRef.current / CAM_SCROLL_V_REF);
    const eased = speedNorm * speedNorm;
    /** Forward-only: coasting |v| after a deep scroll must not keep “zoom out” while user scrolls up. */
    const forward01 = THREE.MathUtils.smoothstep(signedVelSmRef.current, 0, 14);
    const easedForward = eased * forward01;

    let targetZ: number;
    let targetFov: number;

    if (s.mode === 'locked') {
      const zSpeedAway = touchScroll ? 0 : eased * CAM_SCROLL_LOCKED_Z_SPEED_AWAY;
      const fovSpeedAway = touchScroll ? 0 : eased * CAM_SCROLL_LOCKED_FOV_SPEED_AWAY;
      const targetZPos = CAM_BASE_Z + easedForward * CAM_SCROLL_LOCKED_Z_PULL_DOWN + zSpeedAway;
      const targetFovPos = CAM_BASE_FOV + easedForward * CAM_SCROLL_LOCKED_FOV_DOWN + fovSpeedAway;
      /** Trim the last ~25% of the zoom-in lever so fast “in” scroll stops short of the harshest dolly/FOV. */
      const maxD = Math.max(1, s.maxDepth);
      const shallowTarget = THREE.MathUtils.smoothstep(
        s.depth / maxD,
        0,
        CAM_SCROLL_LOCKED_BACK_ZOOM_IN_DEPTH_FRAC,
      );
      const shallowSmooth = 1 - Math.exp(-delta * CAM_SCROLL_SHALLOW_SMOOTH);
      shallow01SmRef.current += (shallowTarget - shallow01SmRef.current) * shallowSmooth;
      const zoomInEase = Math.min(eased, 0.74) * shallow01SmRef.current;
      const targetZNeg = CAM_BASE_Z - zoomInEase * CAM_SCROLL_LOCKED_Z_PUSH_UP + zSpeedAway;
      const targetFovNeg = Math.max(
        CAM_SCROLL_LOCKED_FOV_MIN,
        CAM_BASE_FOV - zoomInEase * CAM_SCROLL_LOCKED_FOV_UP + fovSpeedAway,
      );
      const wSign = THREE.MathUtils.smoothstep(
        signedVelSmRef.current,
        -CAM_SCROLL_V_SIGN_BLEND,
        CAM_SCROLL_V_SIGN_BLEND,
      );
      targetZ = THREE.MathUtils.lerp(targetZNeg, targetZPos, wSign);
      targetFov = THREE.MathUtils.lerp(targetFovNeg, targetFovPos, wSign);
    } else {
      targetZ = CAM_BASE_Z + eased * CAM_SCROLL_Z_PULL;
      targetFov = CAM_BASE_FOV + eased * CAM_SCROLL_FOV_EXTRA;
    }

    const intro01 = THREE.MathUtils.clamp(s.wormholeHomeIntroCam01 ?? 1, 0, 1);
    const introOpening = 1 - intro01;
    targetZ += introOpening * CAM_MICRO_INTRO_PULL_Z;
    targetFov += introOpening * CAM_MICRO_INTRO_FOV;

    persp.position.x += (CAM_BASE_X - persp.position.x) * ease;
    persp.position.y = CAM_BASE_Y;
    persp.position.z += (targetZ - persp.position.z) * ease;
    persp.fov += (targetFov - persp.fov) * ease;
    persp.updateProjectionMatrix();
  });

  return null;
}

function CoinMesh({ spin, tossToken, spinSyncScroll = false, onLoaded }: CoinMeshProps): ReactElement {
  const { gl } = useThree();
  const rimSideTex = useMemo(() => createCoinRimSideTexture(), []);
  useEffect(() => {
    return () => {
      rimSideTex.dispose();
    };
  }, [rimSideTex]);

  const spinGroup = useRef<THREE.Group>(null);
  /** Fall drift tilt from `WormholeFallingCoin` (inside Y-spin). */
  const fallWobbleGroup = useRef<THREE.Group>(null);
  const flipGroup = useRef<THREE.Group>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const vortexLightA = useRef<THREE.PointLight>(null);
  /** Near-cylinder grazers — stronger reads on the **rim wall** (same motion families as main rim kit). */
  const rimEdgeLightV = useRef<THREE.PointLight>(null);
  const rimEdgeLightDn = useRef<THREE.PointLight>(null);
  const rimEdgeLightUp = useRef<THREE.PointLight>(null);
  /** `/wormhole5` + tunnel flag: 3 coloured lights on helix-like paths (Julia ribbon hues). */
  const helixRibbonLight0 = useRef<THREE.PointLight>(null);
  const helixRibbonLight1 = useRef<THREE.PointLight>(null);
  const helixRibbonLight2 = useRef<THREE.PointLight>(null);
  /** Orbit in the rim plane (XZ at ~coin thickness) for cylindrical edge specular highlights. */
  const rimTangentRing0 = useRef<THREE.PointLight>(null);
  const rimTangentRing1 = useRef<THREE.PointLight>(null);
  const coinFaceFrontRef = useRef<THREE.Mesh>(null);
  const coinFaceBackRef = useRef<THREE.Mesh>(null);
  const faceBackdropNm = useRef(new THREE.Matrix3());
  const faceBackdropNormScratch = useRef(new THREE.Vector3());
  const tunnelBackdropCamDir = useRef(new THREE.Vector3());
  const backdropFaceEmFrontSm = useRef(0);
  const backdropFaceEmBackSm = useRef(0);
  const rimLightA = useRef<THREE.PointLight>(null);
  const rimLightB = useRef<THREE.PointLight>(null);
  const rimLightC = useRef<THREE.PointLight>(null);
  const rimLightD = useRef<THREE.PointLight>(null);
  const rimLightE = useRef<THREE.PointLight>(null);
  const rimLightF = useRef<THREE.PointLight>(null);
  const rimLightG = useRef<THREE.PointLight>(null);
  const [frontTex, backTex] = useTexture([FACE_SRC_FRONT, FACE_SRC_BACK]) as [THREE.Texture, THREE.Texture];
  const backdropMode = useSyncExternalStore(
    subscribeActiveLandingBackdropMode,
    getActiveLandingBackdropMode,
    () => 'original',
  );

  const faceMaterialFront = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LOGO_FACE_COLOR.clone(),
        transparent: true,
        metalness: FACE_METALNESS,
        roughness: FACE_ROUGHNESS,
        side: THREE.FrontSide,
      }),
    [],
  );

  const faceMaterialBack = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LOGO_FACE_COLOR.clone(),
        transparent: true,
        metalness: FACE_METALNESS,
        roughness: FACE_ROUGHNESS,
        side: THREE.FrontSide,
      }),
    [],
  );

  useLayoutEffect(() => {
    layoutFaceTexture(frontTex);
    layoutFaceTexture(backTex);
    const cap = Math.min(16, gl.capabilities.getMaxAnisotropy());
    frontTex.anisotropy = cap;
    backTex.anisotropy = cap;
    faceMaterialFront.map = frontTex;
    faceMaterialFront.needsUpdate = true;
    faceMaterialBack.map = backTex;
    faceMaterialBack.needsUpdate = true;
    return () => {
      resetFaceTextureLayout(frontTex);
      resetFaceTextureLayout(backTex);
    };
  }, [gl, frontTex, backTex, faceMaterialFront, faceMaterialBack]);

  const loadedRef = useRef(false);
  useLayoutEffect(() => {
    if (loadedRef.current || !onLoaded) return;
    loadedRef.current = true;
    requestAnimationFrame(() => onLoaded());
  }, [onLoaded]);

  const prevTossToken = useRef(0);
  const flipStartElapsed = useRef<number | null>(null);
  const reflectDna = useMemo<ReflectDna>(() => makeReflectDna(), []);

  /** Reused when updating rim point-light positions (avoid per-frame Vector3 alloc). */
  const rimLightPosScratch = useRef(new THREE.Vector3());

  /** Signed scroll-driven spin rate (rad/s), smoothed toward tunnel velocity target. */
  const scrollSpinRateSmoothedRef = useRef<number | null>(null);
  const prevScrollInputIdleRef = useRef(1);
  const spinSoftEntryUntilRef = useRef(0);

  const pathname = usePathname();

  useFrame((state, delta) => {
    const vortexReflective = backdropMode === 'vortext2';
    if (spin && spinGroup.current) {
      if (spinSyncScroll) {
        const s = tunnelStore.getState();
        const vel = s.velocity;
        const av = Math.abs(vel);
        const scrollBoost = Math.min(av * 0.038, 4.2);
        const visMul = s.wormholeScrollVisualMul ?? 1;
        const dir = (av < 0.06 ? 1 : Math.sign(vel)) * visMul;
        const targetSpinRate = (0.62 + scrollBoost) * dir;

        if (scrollSpinRateSmoothedRef.current === null) {
          scrollSpinRateSmoothedRef.current = targetSpinRate;
        }

        const idle = s.scrollInputIdle;
        if (
          prevScrollInputIdleRef.current > 0.96 &&
          idle < 0.88 &&
          av > 0.14
        ) {
          spinSoftEntryUntilRef.current = state.clock.elapsedTime + SPIN_SOFT_ENTRY_HOLD_SEC;
        }
        prevScrollInputIdleRef.current = idle;

        let lambda = SPIN_RATE_SMOOTH_LAMBDA;
        if (state.clock.elapsedTime < spinSoftEntryUntilRef.current) {
          lambda = SPIN_RATE_SMOOTH_LAMBDA_SOFT;
        }

        const prevRate = scrollSpinRateSmoothedRef.current;
        scrollSpinRateSmoothedRef.current +=
          (targetSpinRate - prevRate) * (1 - Math.exp(-lambda * delta));
        spinGroup.current.rotation.y += delta * scrollSpinRateSmoothedRef.current;
      } else {
        scrollSpinRateSmoothedRef.current = null;
        spinGroup.current.rotation.y += delta * 0.62;
      }
    }

    const fw = fallWobbleGroup.current;
    if (fw) {
      if (spin && spinSyncScroll) {
        const b = getWormholeFallMotionSnapshot();
        fw.rotation.x = THREE.MathUtils.degToRad(b.rotateXDeg);
        fw.rotation.z = THREE.MathUtils.degToRad(b.rotateZDeg);
      } else {
        fw.rotation.x = 0;
        fw.rotation.z = 0;
      }
    }

    const flip = flipGroup.current;
    if (tossToken !== prevTossToken.current) {
      prevTossToken.current = tossToken;
      if (tossToken > 0) {
        if (flip) flip.rotation.x = 0;
        flipStartElapsed.current = state.clock.elapsedTime;
      }
    }

    if (flip && flipStartElapsed.current !== null) {
      const elapsed = state.clock.elapsedTime - flipStartElapsed.current;
      const u = Math.min(1, elapsed / TOSS_DURATION_SEC);
      flip.rotation.x = u * TOSS_FLIP_RADIANS;
      if (u >= 1) {
        flip.rotation.x = 0;
        flipStartElapsed.current = null;
      }
    }

    const t = state.clock.elapsedTime;
    const avScroll = Math.abs(tunnelStore.getState().velocity);
    const fastBlend = THREE.MathUtils.smoothstep(avScroll, REFLECT_SCROLL_V_START, REFLECT_SCROLL_V_END);
    const reflectPhaseMul = 1 + fastBlend * fastBlend * REFLECT_PHASE_MUL_EXTRA;
    const rt = t * reflectPhaseMul;
    const d = reflectDna;
    const ch = reflectChaos(rt, d.rimWavePh) * 0.045;

    const ts = tunnelStore.getState();
    const wormhole5HelixRefl =
      pathname === '/wormhole5' && ts.wormhole5CoinHelixReflectionEnabled;
    const backdropFaceOn = ts.wormholeCoinBackdropFaceLightEnabled;
    const rimUvOn = ts.wormholeCoinGunmetalRimUvMotionEnabled;
    const rimEmissiveOn = ts.wormholeCoinGunmetalRimEmissiveShimmerEnabled;
    const sweepOn = ts.wormholeCoinGunmetalRimSweepLightsEnabled;
    const edgeGrazeOn = ts.wormholeCoinGunmetalRimEdgeGrazeLightsEnabled;
    const tangentRingOn = ts.wormholeCoinGunmetalRimTangentRingLightsEnabled;

    /** Scroll rim-side UVs (reed + grain) so cylindrical edge picks up motion even between glints. */
    if (rimUvOn) {
      rimSideTex.offset.x =
        rt * 0.013 +
        0.028 * Math.sin(rt * 0.91 + d.rimWavePh) +
        0.019 * Math.sin(rt * 1.52 + d.lights[3]!.ph);
      rimSideTex.offset.y =
        0.022 * Math.sin(rt * 1.04 + d.rimWavePh * 1.15) +
        0.016 * Math.sin(rt * 1.68 + d.lights[5]!.ph);
    }

    const m = rimMat.current;
    if (m) {
      if (vortexReflective) {
        m.emissive.setHSL((0.74 + rt * 0.19 + d.vortexHueSkew) % 1, 0.5, 0.52);
        m.emissiveIntensity =
          RIM_EMISSIVE_BASE * 1.12 +
          Math.sin(rt * 4.8 * d.vortexRimHz + d.vortexRimPh) * (RIM_EMISSIVE_WAVE * 1.28) +
          ch * 1.2;
      } else if (rimEmissiveOn) {
        m.emissive.setHSL((rt * 0.11 + d.hueSkew) % 1, 0.42, 0.545);
        m.emissiveIntensity =
          RIM_EMISSIVE_BASE * 0.805 +
          Math.sin(rt * 2.35 * d.rimWaveHz + d.rimWavePh) * (RIM_EMISSIVE_WAVE * 0.72) +
          ch;
      } else {
        m.emissive.set(RIM_EMISSIVE_INITIAL_HEX);
        m.emissiveIntensity = RIM_EMISSIVE_BASE * 0.805;
      }
    }

    const la = vortexLightA.current;
    if (la) {
      if (vortexReflective) {
        la.intensity =
          0.88 + 0.32 * Math.sin(rt * 2.45 * d.vortexWaveHz + d.vortexWavePh) + ch * 0.9;
        la.color.setHSL((0.79 + rt * 0.13 + d.vortexHueSkew * 0.5) % 1, 0.44, 0.535);
        const vx = 1.62 + 0.62 * Math.sin(rt * 2.05 * d.vortexWaveHz + d.vortexWavePh);
        const vy = 0.26 + 1.05 * Math.sin(rt * 1.58 * d.vortexWaveHz + d.vortexWavePh * 1.15);
        const vz = 1.58 + 0.58 * Math.cos(rt * 1.92 * d.vortexWaveHz + d.vortexWavePh * 0.85);
        la.position.set(vx, vy, vz);
      } else {
        la.intensity = 0;
      }
    }

    const ra = rimLightA.current;
    const rb = rimLightB.current;
    const rc = rimLightC.current;
    const rd = rimLightD.current;
    const re = rimLightE.current;
    const rf = rimLightF.current;
    const rg = rimLightG.current;
    if (!vortexReflective) {
      const L = d.lights;
      const scratch = rimLightPosScratch.current;

      if (sweepOn) {
        if (ra) {
          ra.intensity =
            0.365 + 0.24 * Math.sin(rt * 2.05 * L[0].hz + L[0].ph) + reflectChaos(rt, L[0].ph) * 0.038;
          ra.color.setHSL((rt * 0.11 + L[0].hueSkew) % 1, 0.38, 0.58);
        }
        if (rb) {
          rb.intensity =
            0.332 + 0.21 * Math.sin(rt * 2.55 * L[1].hz + L[1].ph + 0.8) + reflectChaos(rt, L[1].ph) * 0.035;
          rb.color.setHSL((0.38 + rt * 0.13 + L[1].hueSkew) % 1, 0.36, 0.56);
        }
        if (rc) {
          rc.intensity =
            0.298 + 0.26 * Math.sin(rt * 1.85 * L[2].hz + L[2].ph + 1.4) + reflectChaos(rt, L[2].ph) * 0.035;
          rc.color.setHSL((0.72 + rt * 0.09 + L[2].hueSkew) % 1, 0.34, 0.57);
        }
        if (rd) {
          rd.intensity =
            0.352 + 0.22 * Math.sin(rt * 2.25 * L[3].hz + L[3].ph + 2.1) + reflectChaos(rt, L[3].ph) * 0.035;
          rd.color.setHSL((0.15 + rt * 0.15 + L[3].hueSkew) % 1, 0.39, 0.545);
        }
        if (re) {
          re.intensity =
            0.318 + 0.23 * Math.sin(rt * 2.35 * L[4].hz + L[4].ph + 0.35) + reflectChaos(rt, L[4].ph) * 0.035;
          re.color.setHSL((0.55 + rt * 0.12 + L[4].hueSkew) % 1, 0.37, 0.565);
        }
        if (rf) {
          rf.intensity =
            0.288 + 0.25 * Math.sin(rt * 1.95 * L[5].hz + L[5].ph + 2.65) + reflectChaos(rt, L[5].ph) * 0.035;
          rf.color.setHSL((0.92 + rt * 0.1 + L[5].hueSkew) % 1, 0.33, 0.552);
        }
        if (rg) {
          rg.intensity =
            0.338 + 0.2 * Math.sin(rt * 2.65 * L[6].hz + L[6].ph + 1.15) + reflectChaos(rt, L[6].ph) * 0.035;
          rg.color.setHSL((0.28 + rt * 0.14 + L[6].hueSkew) % 1, 0.36, 0.558);
        }

        const rimRefs = [ra, rb, rc, rd, re, rf, rg] as const;
        for (let i = 0; i < 7; i++) {
          const ref = rimRefs[i];
          if (!ref) continue;
          setRimLightWorldPosition(L[i]!, rt, scratch);
          ref.position.copy(scratch);
        }
      } else {
        if (ra) ra.intensity = 0;
        if (rb) rb.intensity = 0;
        if (rc) rc.intensity = 0;
        if (rd) rd.intensity = 0;
        if (re) re.intensity = 0;
        if (rf) rf.intensity = 0;
        if (rg) rg.intensity = 0;
      }

      if (edgeGrazeOn) {
        const lev = rimEdgeLightV.current;
        const led = rimEdgeLightDn.current;
        const leu = rimEdgeLightUp.current;
        if (lev) {
          setRimLightWorldPosition(L[0]!, rt, scratch, RIM_EDGE_GRAZE_R);
          lev.position.copy(scratch);
          lev.intensity =
            0.2 +
            0.14 * Math.sin(rt * 2.02 * L[0].hz + L[0].ph) +
            reflectChaos(rt, L[0].ph + 1.7) * 0.045;
          lev.color.setHSL((rt * 0.1 + L[0].hueSkew + 0.02) % 1, 0.36, 0.58);
        }
        if (led) {
          setRimLightWorldPosition(L[1]!, rt, scratch, RIM_EDGE_GRAZE_R);
          led.position.copy(scratch);
          led.intensity =
            0.175 +
            0.12 * Math.sin(rt * 1.92 * L[1].hz + L[1].ph + 0.4) +
            reflectChaos(rt, L[1].ph + 2.1) * 0.04;
          led.color.setHSL((0.62 + rt * 0.11 + L[1].hueSkew) % 1, 0.34, 0.56);
        }
        if (leu) {
          setRimLightWorldPosition(L[2]!, rt, scratch, RIM_EDGE_GRAZE_R);
          leu.position.copy(scratch);
          leu.intensity =
            0.185 +
            0.125 * Math.sin(rt * 2.18 * L[2].hz + L[2].ph + 0.95) +
            reflectChaos(rt, L[2].ph + 2.4) * 0.042;
          leu.color.setHSL((0.22 + rt * 0.12 + L[2].hueSkew) % 1, 0.35, 0.57);
        }
      } else {
        if (rimEdgeLightV.current) rimEdgeLightV.current.intensity = 0;
        if (rimEdgeLightDn.current) rimEdgeLightDn.current.intensity = 0;
        if (rimEdgeLightUp.current) rimEdgeLightUp.current.intensity = 0;
      }

      const tr0 = rimTangentRing0.current;
      const tr1 = rimTangentRing1.current;
      if (tangentRingOn) {
        const RR = RIM_TANGENT_RING_R;
        const a0 = rt * 1.18 + d.rimWavePh * 0.4;
        const a1 = -rt * 0.92 + d.rimWavePh * 1.1 + 2.1;
        const yWave = 0.075 * Math.sin(rt * 1.33 + d.rimWavePh);
        if (tr0) {
          tr0.position.set(
            RR * Math.cos(a0),
            yWave + 0.045 * Math.sin(rt * 0.88),
            RR * Math.sin(a0),
          );
          tr0.intensity = 0.24 + 0.16 * Math.sin(rt * 2.08 + d.rimWavePh);
          tr0.color.setHex(0xd8e8ff);
        }
        if (tr1) {
          tr1.position.set(
            RR * Math.cos(a1),
            -yWave * 0.85 + 0.038 * Math.cos(rt * 0.76),
            RR * Math.sin(a1),
          );
          tr1.intensity = 0.21 + 0.14 * Math.sin(rt * 1.96 + d.rimWavePh * 0.85);
          tr1.color.setHex(0xe8f0fc);
        }
      } else {
        if (tr0) tr0.intensity = 0;
        if (tr1) tr1.intensity = 0;
      }
    } else {
      if (ra) ra.intensity = 0;
      if (rb) rb.intensity = 0;
      if (rc) rc.intensity = 0;
      if (rd) rd.intensity = 0;
      if (re) re.intensity = 0;
      if (rf) rf.intensity = 0;
      if (rg) rg.intensity = 0;
      if (rimEdgeLightV.current) rimEdgeLightV.current.intensity = 0;
      if (rimEdgeLightDn.current) rimEdgeLightDn.current.intensity = 0;
      if (rimEdgeLightUp.current) rimEdgeLightUp.current.intensity = 0;
      if (rimTangentRing0.current) rimTangentRing0.current.intensity = 0;
      if (rimTangentRing1.current) rimTangentRing1.current.intensity = 0;
    }

    const hb0 = helixRibbonLight0.current;
    const hb1 = helixRibbonLight1.current;
    const hb2 = helixRibbonLight2.current;
    if (wormhole5HelixRefl) {
      const depthNow = ts.depth;
      const helixMul = vortexReflective ? 0.56 : 1;
      const ribbonLights = [hb0, hb1, hb2];
      for (let h = 0; h < 3; h++) {
        const pl = ribbonLights[h];
        if (!pl) continue;
        const phase = h * ((Math.PI * 2) / 3);
        const tt = rt * 0.4 + depthNow * 0.014 + phase * 0.07;
        const ang = phase + tt * Math.PI * 2 * HELIX_REFLECT_TWIST_TURNS;
        const lift = 0.5 * Math.sin(rt * 1.08 + phase * 1.25);
        const x =
          HELIX_REFLECT_ORBIT_R * Math.cos(ang) + 0.26 * Math.sin(rt * 0.58 + phase);
        const y = HELIX_REFLECT_ORBIT_R * Math.sin(ang) * 0.9 + lift;
        const z = 0.44 * Math.sin(tt * 4.15 + phase) + 0.52 * Math.cos(rt * 0.52 + h * 1.7);
        pl.position.set(x, y, z);
        const pulse =
          0.38 +
          0.36 * Math.sin(rt * 1.82 + phase * 2.05) +
          0.14 * Math.sin(depthNow * 0.065 + rt * 0.31);
        pl.intensity = pulse * 0.95 * helixMul;
        pl.color.setHex(HELIX_RIBBON_REFLECTION_HEX[h]!);
      }
    } else {
      if (hb0) hb0.intensity = 0;
      if (hb1) hb1.intensity = 0;
      if (hb2) hb2.intensity = 0;
    }

    /** Full-disc tunnel fill on faces (emissive), uniform per face — not rim. */
    const mf = faceMaterialFront;
    const mb = faceMaterialBack;
    const nm = faceBackdropNm.current;
    const nScratch = faceBackdropNormScratch.current;
    const tunnelDir = tunnelBackdropCamDir.current;
    state.camera.getWorldDirection(tunnelDir);
    const emEase = 1 - Math.exp(-delta * 14);
    if (!backdropFaceOn) {
      backdropFaceEmFrontSm.current += (0 - backdropFaceEmFrontSm.current) * emEase;
      backdropFaceEmBackSm.current += (0 - backdropFaceEmBackSm.current) * emEase;
      mf.emissive.setRGB(0, 0, 0);
      mb.emissive.setRGB(0, 0, 0);
      mf.emissiveIntensity = backdropFaceEmFrontSm.current;
      mb.emissiveIntensity = backdropFaceEmBackSm.current;
    } else {
      const frontMesh = coinFaceFrontRef.current;
      const backMesh = coinFaceBackRef.current;
      let tFront = 0;
      let tBack = 0;
      if (frontMesh) {
        frontMesh.updateWorldMatrix(true, false);
        nm.getNormalMatrix(frontMesh.matrixWorld);
        nScratch.set(0, 0, 1).applyMatrix3(nm).normalize();
        const rawF = THREE.MathUtils.clamp(nScratch.dot(tunnelDir), 0, 1);
        tFront = THREE.MathUtils.smoothstep(BACKDROP_FACE_DOT_LO, BACKDROP_FACE_DOT_HI, rawF);
      }
      if (backMesh) {
        backMesh.updateWorldMatrix(true, false);
        nm.getNormalMatrix(backMesh.matrixWorld);
        nScratch.set(0, 0, 1).applyMatrix3(nm).normalize();
        const rawB = THREE.MathUtils.clamp(nScratch.dot(tunnelDir), 0, 1);
        tBack = THREE.MathUtils.smoothstep(BACKDROP_FACE_DOT_LO, BACKDROP_FACE_DOT_HI, rawB);
      }
      const targetF = tFront * BACKDROP_FACE_EMISSIVE_MAX;
      const targetB = tBack * BACKDROP_FACE_EMISSIVE_MAX;
      backdropFaceEmFrontSm.current += (targetF - backdropFaceEmFrontSm.current) * emEase;
      backdropFaceEmBackSm.current += (targetB - backdropFaceEmBackSm.current) * emEase;
      mf.emissive.copy(BACKDROP_FACE_EMISSIVE_COLOR);
      mb.emissive.copy(BACKDROP_FACE_EMISSIVE_COLOR);
      mf.emissiveIntensity = backdropFaceEmFrontSm.current;
      mb.emissiveIntensity = backdropFaceEmBackSm.current;
    }
  });

  const r = 1;
  const thickness = 0.2;

  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3.2, 4, 5]} intensity={0.42} />
      <directionalLight position={[-3.2, 4, -5]} intensity={0.42} />
      <directionalLight position={[-2, -1, 2]} intensity={0.3125} color="#a8b8ff" />
      <pointLight position={[0, 0, 1.35]} intensity={0.2} distance={8} />
      <pointLight position={[0, 0, -1.35]} intensity={0.2} distance={8} />
      <pointLight ref={rimEdgeLightV} position={[0, 0, 1.22]} intensity={0} distance={5.5} decay={2} />
      <pointLight ref={rimEdgeLightDn} position={[1.1, -0.5, 1.1]} intensity={0} distance={5.5} decay={2} />
      <pointLight ref={rimEdgeLightUp} position={[-1.1, 0.5, 1.05]} intensity={0} distance={5.5} decay={2} />
      <pointLight ref={rimTangentRing0} position={[0, 0, 0]} intensity={0} distance={5.2} decay={2} />
      <pointLight ref={rimTangentRing1} position={[0, 0, 0]} intensity={0} distance={5.2} decay={2} />
      <pointLight ref={helixRibbonLight0} position={[0, 0, 0]} intensity={0} distance={14} decay={2} />
      <pointLight ref={helixRibbonLight1} position={[0, 0, 0]} intensity={0} distance={14} decay={2} />
      <pointLight ref={helixRibbonLight2} position={[0, 0, 0]} intensity={0} distance={14} decay={2} />
      <pointLight ref={rimLightA} position={[2.35, 1.05, 1.25]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightB} position={[-2.05, -0.95, 1.45]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightC} position={[0.25, 2.35, 0.95]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightD} position={[1.65, -1.55, -1.15]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightE} position={[-1.85, 1.42, -1.08]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightF} position={[-0.42, -2.18, 1.22]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightG} position={[2.08, -0.48, -1.38]} intensity={0} distance={16} decay={2} />
      <pointLight ref={vortexLightA} position={[1.8, 0.4, 1.8]} intensity={0} distance={9} />

      <group ref={spinGroup}>
        <group ref={fallWobbleGroup}>
          <group ref={flipGroup}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, thickness, 72, 1, true]} />
            <meshStandardMaterial
              ref={rimMat}
              map={rimSideTex}
              bumpMap={rimSideTex}
              bumpScale={0.028}
              color={RIM_DIFFUSE_HEX}
              metalness={RIM_METALNESS * 1.14}
              roughness={RIM_ROUGHNESS * 0.76}
              emissive={RIM_EMISSIVE_INITIAL_HEX}
              emissiveIntensity={RIM_EMISSIVE_BASE * 0.805}
              transparent={false}
              opacity={1}
            />
          </mesh>

          <mesh ref={coinFaceFrontRef} position={[0, 0, thickness / 2]} material={faceMaterialFront}>
            <circleGeometry args={[r, 72]} />
          </mesh>
          <mesh
            ref={coinFaceBackRef}
            position={[0, 0, -thickness / 2]}
            rotation={[0, Math.PI, 0]}
            material={faceMaterialBack}
          >
            <circleGeometry args={[r, 72]} />
          </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export type LogoCoinCanvasProps = {
  /** When false, coin stays static (reduced motion). */
  spin: boolean;
  /** Bump to trigger a 3D toss flip (X-axis) so front/back textures both show. */
  tossToken?: number;
  /** Wormhole: spin rate tracks mouse/trackpad scroll via `tunnelStore.velocity`. */
  spinSyncScroll?: boolean;
};

/** Matches `globals.css` lg breakpoint; oversized GL canvas only on this+ for `/` (see hook below). */
const WORMHOLE_LAB_DESKTOP_MIN_WIDTH_MQ = '(min-width: 1024px)';

function subscribeDesktopLgMq(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(WORMHOLE_LAB_DESKTOP_MIN_WIDTH_MQ);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function snapshotDesktopLgMq(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(WORMHOLE_LAB_DESKTOP_MIN_WIDTH_MQ).matches;
}

/**
 * Wormhole scroll zoom needs a larger R3F canvas than the hero box so the coin does not clip.
 * Lab routes (`/wormhole…`) always use it; production home (`/`) used to match when the URL was
 * `/wormhole6` — restore that **desktop lg+** only so mobile layout stays unchanged.
 */
function useWormholeLabOversizedCanvas(spinSyncScroll: boolean): boolean {
  const pathname = usePathname();
  const desktopLg = useSyncExternalStore(
    subscribeDesktopLgMq,
    snapshotDesktopLgMq,
    () => false,
  );
  if (!spinSyncScroll) return false;
  if (pathname?.startsWith('/wormhole')) return true;
  return pathname === '/' && desktopLg;
}

/**
 * 3D coin: front / back face PNGs, iridescent emissive rim, Y-axis spin; toss flips in-scene on X.
 */
export function LogoCoinCanvas({ spin, tossToken = 0, spinSyncScroll = false }: LogoCoinCanvasProps): ReactElement {
  const reducedMotion = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );
  const [coinShown, setCoinShown] = useState(reducedMotion);
  const onCoinAssetsReady = useCallback(() => setCoinShown(true), []);

  useEffect(() => {
    if (reducedMotion) setCoinShown(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (coinShown || reducedMotion) return;
    const failSafe = window.setTimeout(() => setCoinShown(true), 5000);
    return () => clearTimeout(failSafe);
  }, [coinShown, reducedMotion]);

  const wormholeLabBigCanvas = useWormholeLabOversizedCanvas(spinSyncScroll);
  const canvasDpr = useMemo((): number | [number, number] => {
    if (typeof window === 'undefined') return [1, 2];
    return webglCoinCanvasDpr(window.devicePixelRatio || 1);
  }, []);

  /** R3F measures the canvas box once at mount; after visibility/layout shifts the framebuffer can stay undersized until a resize — visible as top/bottom clip on the first strong zoom-in. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!coinShown && !reducedMotion) return;
    const fire = () => window.dispatchEvent(new Event('resize'));
    const t0 = window.setTimeout(fire, 0);
    const t1 = window.setTimeout(fire, 150);
    const t2 = window.setTimeout(fire, 1100);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [coinShown, reducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
    return () => clearTimeout(id);
  }, [wormholeLabBigCanvas]);

  return (
    <div
      className={[
        'block min-h-0 overflow-visible leading-none',
        wormholeLabBigCanvas
          ? 'relative left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          : 'h-full w-full',
        'transition-opacity duration-1000 ease-out motion-reduce:transition-none',
        coinShown ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      style={
        wormholeLabBigCanvas
          ? {
              width: `${WORMHOLE_LAB_COIN_CANVAS_PERCENT}%`,
              height: `${WORMHOLE_LAB_COIN_CANVAS_PERCENT}%`,
            }
          : undefined
      }
      aria-busy={!coinShown}
    >
      <Canvas
        className="logo-coin-canvas-root block h-full w-full min-h-0 touch-none overflow-visible leading-none"
        style={{ overflow: 'visible' }}
        dpr={canvasDpr}
        resize={
          spinSyncScroll
            ? /** Wormhole: wheel drives depth, not page scroll — skip scroll-linked resize to avoid canvas/layout jitter. */
              { scroll: false, debounce: 0, offsetSize: true }
            : { scroll: true, debounce: 0, offsetSize: true }
        }
        gl={{ alpha: true, antialias: webglCoinAntialias(), powerPreference: webglPowerPreference() }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NoToneMapping;
          const canvas = gl.domElement;
          canvas.style.overflow = 'visible';
          const p = canvas.parentElement;
          if (p) {
            p.style.overflow = 'visible';
          }
        }}
        camera={{
          position: [CAM_BASE_X, CAM_BASE_Y, CAM_BASE_Z],
          fov: CAM_BASE_FOV,
          near: 0.1,
          far: 24,
        }}
      >
        <ScrollVelocityCamera enabled={spinSyncScroll && !reducedMotion} />
        <Suspense fallback={null}>
          <CoinMesh
            spin={spin}
            tossToken={tossToken}
            spinSyncScroll={spinSyncScroll}
            onLoaded={onCoinAssetsReady}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
