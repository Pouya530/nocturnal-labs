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
import { WORMHOLE_LAB_COIN_CANVAS_PERCENT } from '@/lib/wormholePageConfig';
import { tunnelStore } from '@/tunnel/tunnelStore';

/** Place assets in `public/brand/` (front: Latin motto, back: alternate wordmark) */
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

/** Rim shimmer / point-light orbit: ramp phase speed only at very high tunnel scroll velocity. */
const REFLECT_SCROLL_V_START = 48;
const REFLECT_SCROLL_V_END = 108;
/** Extra phase multiplier at max velocity (1 + this ≈ peak vs idle). */
const REFLECT_PHASE_MUL_EXTRA = 5.5;

/** Per coin mount: randomise rim / point-light reflection phases & rates (see `reflectDna` in `CoinMesh`). */
function makeReflectDna() {
  const pi2 = Math.PI * 2;
  const ph = () => Math.random() * pi2;
  const hz = () => 0.86 + Math.random() * 0.26;
  return {
    hueSkew: (Math.random() - 0.5) * 0.26,
    rimWaveHz: hz(),
    rimWavePh: ph(),
    vortexHueSkew: (Math.random() - 0.5) * 0.2,
    vortexRimHz: hz(),
    vortexRimPh: ph(),
    vortexWaveHz: hz(),
    vortexWavePh: ph(),
    /** Rim lights A–G: phase, frequency mul, small hue offset on animated HSL. */
    lights: Array.from({ length: 7 }, () => ({
      ph: ph(),
      hz: hz(),
      hueSkew: (Math.random() - 0.5) * 0.16,
    })),
  };
}

type ReflectDna = ReturnType<typeof makeReflectDna>;

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

  useFrame((_, delta) => {
    const persp = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.exp(-16 * dt);

    if (!enabled) {
      persp.position.x += (CAM_BASE_X - persp.position.x) * ease;
      persp.position.y = CAM_BASE_Y;
      persp.position.z += (CAM_BASE_Z - persp.position.z) * ease;
      persp.fov += (CAM_BASE_FOV - persp.fov) * ease;
      persp.updateProjectionMatrix();
      return;
    }

    const s = tunnelStore.getState();
    const v = s.velocity;
    const camVelMul = s.mode === 'locked' ? CAM_SCROLL_LOCKED_VEL_SCALE : 1;
    const av = Math.abs(v) * camVelMul;
    const speedNorm = Math.min(1, av / CAM_SCROLL_V_REF);
    const eased = speedNorm * speedNorm;

    let targetZ: number;
    let targetFov: number;
    if (s.mode === 'locked') {
      const zSpeedAway = eased * CAM_SCROLL_LOCKED_Z_SPEED_AWAY;
      const fovSpeedAway = eased * CAM_SCROLL_LOCKED_FOV_SPEED_AWAY;
      if (v >= 0) {
        targetZ = CAM_BASE_Z + eased * CAM_SCROLL_LOCKED_Z_PULL_DOWN + zSpeedAway;
        targetFov = CAM_BASE_FOV + eased * CAM_SCROLL_LOCKED_FOV_DOWN + fovSpeedAway;
      } else {
        /** Trim the last ~25% of the zoom-in lever so fast “in” scroll stops short of the harshest dolly/FOV. */
        const zoomInEase = Math.min(eased, 0.74);
        targetZ = CAM_BASE_Z - zoomInEase * CAM_SCROLL_LOCKED_Z_PUSH_UP + zSpeedAway;
        targetFov = Math.max(
          CAM_SCROLL_LOCKED_FOV_MIN,
          CAM_BASE_FOV - zoomInEase * CAM_SCROLL_LOCKED_FOV_UP + fovSpeedAway,
        );
      }
    } else {
      targetZ = CAM_BASE_Z + eased * CAM_SCROLL_Z_PULL;
      targetFov = CAM_BASE_FOV + eased * CAM_SCROLL_FOV_EXTRA;
    }

    persp.position.x += (CAM_BASE_X - persp.position.x) * ease;
    persp.position.y = CAM_BASE_Y;
    persp.position.z += (targetZ - persp.position.z) * ease;
    persp.fov += (targetFov - persp.fov) * ease;
    persp.updateProjectionMatrix();
  });

  return null;
}

function CoinMesh({ spin, tossToken, spinSyncScroll = false, onLoaded }: CoinMeshProps): ReactElement {
  const rimSideTex = useMemo(() => createCoinRimSideTexture(), []);
  useEffect(() => {
    return () => {
      rimSideTex.dispose();
    };
  }, [rimSideTex]);

  const spinGroup = useRef<THREE.Group>(null);
  const flipGroup = useRef<THREE.Group>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const vortexLightA = useRef<THREE.PointLight>(null);
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
    faceMaterialFront.map = frontTex;
    faceMaterialFront.needsUpdate = true;
    faceMaterialBack.map = backTex;
    faceMaterialBack.needsUpdate = true;
    return () => {
      resetFaceTextureLayout(frontTex);
      resetFaceTextureLayout(backTex);
    };
  }, [frontTex, backTex, faceMaterialFront, faceMaterialBack]);

  const loadedRef = useRef(false);
  useLayoutEffect(() => {
    if (loadedRef.current || !onLoaded) return;
    loadedRef.current = true;
    requestAnimationFrame(() => onLoaded());
  }, [onLoaded]);

  const prevTossToken = useRef(0);
  const flipStartElapsed = useRef<number | null>(null);
  const reflectDna = useMemo<ReflectDna>(() => makeReflectDna(), []);

  useFrame((state, delta) => {
    const vortexReflective = backdropMode === 'vortext2';
    if (spin && spinGroup.current) {
      if (spinSyncScroll) {
        const vel = tunnelStore.getState().velocity;
        const av = Math.abs(vel);
        const scrollBoost = Math.min(av * 0.038, 4.2);
        const w = 0.62 + scrollBoost;
        const visMul = tunnelStore.getState().wormholeScrollVisualMul ?? 1;
        const dir = (av < 0.06 ? 1 : Math.sign(vel)) * visMul;
        spinGroup.current.rotation.y += delta * w * dir;
      } else {
        spinGroup.current.rotation.y += delta * 0.62;
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

    const m = rimMat.current;
    if (m) {
      if (vortexReflective) {
        m.emissive.setHSL((0.74 + rt * 0.19 + d.vortexHueSkew) % 1, 0.5, 0.52);
        m.emissiveIntensity =
          RIM_EMISSIVE_BASE * 1.12 +
          Math.sin(rt * 4.8 * d.vortexRimHz + d.vortexRimPh) * (RIM_EMISSIVE_WAVE * 1.28) +
          ch * 1.2;
      } else {
        m.emissive.setHSL((rt * 0.11 + d.hueSkew) % 1, 0.42, 0.545);
        m.emissiveIntensity =
          RIM_EMISSIVE_BASE * 0.805 +
          Math.sin(rt * 2.35 * d.rimWaveHz + d.rimWavePh) * (RIM_EMISSIVE_WAVE * 0.72) +
          ch;
      }
    }

    const la = vortexLightA.current;
    if (la) {
      if (vortexReflective) {
        la.intensity =
          0.88 + 0.32 * Math.sin(rt * 2.45 * d.vortexWaveHz + d.vortexWavePh) + ch * 0.9;
        la.color.setHSL((0.79 + rt * 0.13 + d.vortexHueSkew * 0.5) % 1, 0.44, 0.535);
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
      if (ra) {
        ra.intensity = 0.365 + 0.24 * Math.sin(rt * 2.05 * L[0].hz + L[0].ph) + reflectChaos(rt, L[0].ph) * 0.038;
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
    } else {
      if (ra) ra.intensity = 0;
      if (rb) rb.intensity = 0;
      if (rc) rc.intensity = 0;
      if (rd) rd.intensity = 0;
      if (re) re.intensity = 0;
      if (rf) rf.intensity = 0;
      if (rg) rg.intensity = 0;
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
      <pointLight ref={rimLightA} position={[2.35, 1.05, 1.25]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightB} position={[-2.05, -0.95, 1.45]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightC} position={[0.25, 2.35, 0.95]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightD} position={[1.65, -1.55, -1.15]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightE} position={[-1.85, 1.42, -1.08]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightF} position={[-0.42, -2.18, 1.22]} intensity={0} distance={16} decay={2} />
      <pointLight ref={rimLightG} position={[2.08, -0.48, -1.38]} intensity={0} distance={16} decay={2} />
      <pointLight ref={vortexLightA} position={[1.8, 0.4, 1.8]} intensity={0} distance={9} />

      <group ref={spinGroup}>
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

          <mesh position={[0, 0, thickness / 2]} material={faceMaterialFront}>
            <circleGeometry args={[r, 72]} />
          </mesh>
          <mesh position={[0, 0, -thickness / 2]} rotation={[0, Math.PI, 0]} material={faceMaterialBack}>
            <circleGeometry args={[r, 72]} />
          </mesh>
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

function useWormholeLabOversizedCanvas(spinSyncScroll: boolean): boolean {
  const pathname = usePathname();
  return Boolean(spinSyncScroll && pathname?.startsWith('/wormhole'));
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
        resize={{ scroll: true, debounce: 0, offsetSize: true }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
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
