'use client';

import type { WormholeAtmospherePreset } from '@/tunnel/wormholeAtmospherePreset';
import type { WormholeHelixTubeVariant } from '@/tunnel/wormholeHelixTubePreset';
import type { WormholeJourneyMouseParallaxMode } from '@/tunnel/wormholeJourneyMouseParallax';

/**
 * Lightweight tunnel state (Zustand-shaped) without an extra runtime dependency.
 * Used only when `isLocalhostHostname` is true in the browser.
 */
export type ScrollMode = 'locked' | 'free';

export type { WormholeAtmospherePreset } from '@/tunnel/wormholeAtmospherePreset';
export type { WormholeHelixTubeVariant } from '@/tunnel/wormholeHelixTubePreset';
export type { WormholeJourneyMouseParallaxMode } from '@/tunnel/wormholeJourneyMouseParallax';

export type TunnelState = {
  mode: ScrollMode;
  depth: number;
  velocity: number;
  /**
   * 1 = no scroll input recently (wheel / touch pan / locked arrow nudge); eases to 0 while the
   * user is actively scrolling. Used for UI (e.g. coin “tube fall”) independent of tunnel
   * velocity, which can coast for a long time after input stops.
   */
  scrollInputIdle: number;
  sensitivity: number;
  friction: number;
  juliaCx: number;
  juliaCy: number;
  discRadius: number;
  iters: number;
  zoomRate: number;
  holeRadius: number;
  spiralPhase: number;
  paletteOffset: number;
  paletteSpeed: number;
  spinSpeed: number;
  /** Scroll clamp upper bound (`useScrollDepth`). Default 256; wormhole uses a larger range. */
  maxDepth: number;
  /** Locked-mode forward drift units/sec when |velocity| is tiny (wormhole flight). 0 = off. */
  wormholeIdleForward: number;
  /** Julia wormhole scene (Three.js) — live bloom + fog tuning via store. */
  ringCount: number;
  ringSpacing: number;
  ringRadius: number;
  helixCount: number;
  particleCount: number;
  fogDensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  /** `/wormhole` UI — debug panel can hide the hero coin for backdrop preview. */
  wormholeCoinVisible: boolean;
  /** `JuliaWormholeBackdrop` (Three.js tube) — debug / `/wormhole2` can turn off to show 2D vortex only. */
  wormhole3dBackgroundEnabled: boolean;
  /** `JuliaWormholeBackdrop` — tube helices (classic ribbons + wormhole2 lab strands). */
  wormholeHelices3dEnabled: boolean;
  /**
   * `/wormhole4` — multiply `LogoCoin` spin direction from scroll velocity (`1` default, `-1` flips).
   */
  wormholeScrollVisualMul: number;
  /**
   * `/wormhole4` — extra helix `rotation.z` drift from `velocity * dt * gain` (`0` = off).
   */
  wormholeScrollHelixVelGain: number;
  /** Tunnel debug — `JuliaWormholeBackdrop`: random view tilt while scrolling the wormhole. */
  wormholeDebugRandomCamTilt: boolean;
  /** Tunnel debug — slow circular pitch/yaw drift on the tunnel camera (idle “orbit” feel). */
  wormholeDebugCircularCamTilt: boolean;
  /**
   * Journey / throat: pointer nudges `camera.lookAt` slightly (parallax). Does not change scroll.
   */
  wormholeJourneyMouseParallax: WormholeJourneyMouseParallaxMode;
  /** Tunnel debug — show `BlackHoleOverlay` under the hero coin on wormhole lab routes. */
  wormholeBlackHoleOverlayEnabled: boolean;
  /**
   * Tunnel debug (localhost): hero coin tap / Space / Enter queues a scroll “up” impulse instead of the coin toss
   * ({@link queueWormholeCoinScrollBoost}).
   */
  wormholeCoinClickTunnelBoost: boolean;
  /**
   * Tunnel debug: when true, hero coin fades slightly while scrolling forward (depth increasing —
   * positive velocity above locked cruise drift when `wormholeIdleForward` is set).
   */
  wormholeCoinFadeOnScrollForward: boolean;
  /**
   * Screen-space atmosphere / vignette above the GL tunnel (`off` or one of the lab presets).
   * Tunneled routes may force `off` on entry; debug panel cycles presets on localhost.
   */
  wormholeAtmospherePreset: WormholeAtmospherePreset;
  /**
   * `/wormhole5` (and localhost home clone): second WebGL pass — {@link CosmicBackdrop} stacked above
   * {@link JuliaWormholeBackdrop} with screen blending so nebula / stream add on without replacing the tunnel.
   */
  wormholeCosmicOverlayEnabled: boolean;
  /**
   * Localhost + `helixLab`: use Julia tube fragment shader (`uMode > 1.5`); when false, solid additive ribbons.
   */
  wormholeHelixJuliaRibbonShaderEnabled: boolean;
  /**
   * When Julia helix tubes are on: fragment style index (`0` classic, `1`–`6` lab presets in `juliaWormholeShaderSources`).
   */
  wormholeHelixTubeVariant: WormholeHelixTubeVariant;
  /** When false, helix tubes use smooth bands only (no Julia fractal detail inside the strand). */
  wormholeHelixTubeJuliaPatternEnabled: boolean;
  /**
   * Helix lab + Julia pattern on: scales tube interior RGB before the scene bloom pass (1 = default).
   * Does not affect rings, sky, or helix tubes when the interior pattern is off.
   */
  wormholeHelixJuliaPatternBloomMul: number;
  /**
   * Helix + Julia pattern on: multi-tap smoothing in Julia space (0 = off, ~0.5 = softer seams).
   */
  wormholeHelixJuliaInteriorBlur: number;
  /**
   * Helix + Julia pattern on: slow shimmer on strand brightness (0 = off).
   */
  wormholeHelixJuliaShimmer: number;
  /**
   * `/wormhole5` only (hero coin): adds coloured point lights along helix-like paths matching Julia ribbon hues.
   */
  wormhole5CoinHelixReflectionEnabled: boolean;
  /**
   * Hero coin gunmetal **cylinder edge**: seven orbiting sweep lights (LogoCoin rim kit A–G).
   */
  wormholeCoinGunmetalRimSweepLightsEnabled: boolean;
  /**
   * Hero coin: three **near-surface** point lights (same motion families, tighter radius) for edge grazing.
   */
  wormholeCoinGunmetalRimEdgeGrazeLightsEnabled: boolean;
  /**
   * Hero coin: two lights orbiting in the **plane of the rim** (tangent to the cylinder) for specular edge streaks.
   */
  wormholeCoinGunmetalRimTangentRingLightsEnabled: boolean;
  /**
   * Hero coin: animate **reed texture** UV scroll on the rim cylinder (`rimSideTex`).
   */
  wormholeCoinGunmetalRimUvMotionEnabled: boolean;
  /**
   * Hero coin: animated **emissive** tint on the gunmetal rim material (iridescent shimmer).
   */
  wormholeCoinGunmetalRimEmissiveShimmerEnabled: boolean;
  /**
   * Hero coin (dev / tunnel debug): **full-disc** emissive on front/back when that face points toward
   * the bright GL tunnel — tunnel debug toggle.
   */
  wormholeCoinBackdropFaceLightEnabled: boolean;
  /**
   * `/wormhole8` preview: apply helix wall inset boost (`helixWallInsetMul=5`) instead of base
   * wormhole5-scale inset (`0.88`).
   */
  wormhole8HelixBoostEnabled: boolean;
  /**
   * Production home intro: when non-null, {@link useScrollDepth} applies this depth and zero
   * velocity each tick instead of integrating scroll (pan/zoom settle before hand-off).
   */
  wormholeIntroDepthOverride: number | null;
  /**
   * `/` micro-intro only (`journeyCameraFromStart`): scales throat journey FOV + camera pullback toward
   * the wormhole3 mouth look (`1` = full framing). Animated `0 → 1` after the loading veil dismisses.
   */
  wormholeHomeIntroCam01: number;
  /** `/cosmic` — Julia density modulation in the volumetric raymarch (0 = off, 1.5 = strong). */
  cosmicJuliaBlend: number;
  /** `/cosmic` — scales fbm density in the nebula pass. */
  cosmicCloudDensity: number;
  /** `/cosmic` — central screen-space core brightness. */
  cosmicCoreIntensity: number;
  /** `/cosmic` — Julia feature scale in the blend (larger = finer filaments). */
  cosmicJuliaZoom: number;
};

const initial: TunnelState = {
  mode: 'locked',
  depth: 0,
  velocity: 0,
  scrollInputIdle: 1,
  sensitivity: 0.193,
  friction: 0.92,
  juliaCx: -0.7269,
  juliaCy: 0.1889,
  discRadius: 0.172,
  iters: 200,
  zoomRate: 0.25,
  holeRadius: 0.28,
  spiralPhase: 0,
  paletteOffset: 0,
  /** Tunnel Julia palette is scroll-driven only (`useScrollDepth` no longer advances this). */
  paletteSpeed: 0,
  spinSpeed: 1,
  maxDepth: 256,
  wormholeIdleForward: 0,
  ringCount: 72,
  ringSpacing: 4,
  ringRadius: 8,
  helixCount: 3,
  particleCount: 2400,
  fogDensity: 0.018,
  bloomStrength: 0.65,
  bloomRadius: 1.5,
  bloomThreshold: 0.02,
  wormholeCoinVisible: true,
  wormhole3dBackgroundEnabled: true,
  wormholeHelices3dEnabled: true,
  wormholeScrollVisualMul: 1,
  wormholeScrollHelixVelGain: 0,
  wormholeDebugRandomCamTilt: false,
  wormholeDebugCircularCamTilt: false,
  wormholeJourneyMouseParallax: 'off',
  wormholeBlackHoleOverlayEnabled: false,
  wormholeCoinClickTunnelBoost: false,
  wormholeCoinFadeOnScrollForward: true,
  wormholeAtmospherePreset: 'nebula',
  wormholeCosmicOverlayEnabled: false,
  wormholeHelixJuliaRibbonShaderEnabled: true,
  wormholeHelixTubeVariant: 0,
  wormholeHelixTubeJuliaPatternEnabled: true,
  wormholeHelixJuliaPatternBloomMul: 1,
  wormholeHelixJuliaInteriorBlur: 0,
  wormholeHelixJuliaShimmer: 0,
  wormhole5CoinHelixReflectionEnabled: false,
  wormholeCoinGunmetalRimSweepLightsEnabled: true,
  wormholeCoinGunmetalRimEdgeGrazeLightsEnabled: true,
  wormholeCoinGunmetalRimTangentRingLightsEnabled: true,
  wormholeCoinGunmetalRimUvMotionEnabled: true,
  wormholeCoinGunmetalRimEmissiveShimmerEnabled: true,
  wormholeCoinBackdropFaceLightEnabled: false,
  wormhole8HelixBoostEnabled: true,
  wormholeIntroDepthOverride: null,
  wormholeHomeIntroCam01: 1,
  cosmicJuliaBlend: 0.7,
  cosmicCloudDensity: 1.0,
  cosmicCoreIntensity: 1.2,
  cosmicJuliaZoom: 1.6,
};

let state: TunnelState = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const tunnelStore = {
  getState(): TunnelState {
    return state;
  },
  setState(partial: Partial<TunnelState>) {
    state = { ...state, ...partial };
    emit();
  },
  reset() {
    state = { ...initial };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
