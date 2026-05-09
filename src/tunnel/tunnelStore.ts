'use client';

/**
 * Lightweight tunnel state (Zustand-shaped) without an extra runtime dependency.
 * Used only when `isLocalhostHostname` is true in the browser.
 */
export type ScrollMode = 'locked' | 'free';

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
  /** `/wormhole4`–`/wormhole5` only: gradient vignette overlay above the GL tunnel. */
  wormholeAtmosphereOverlayEnabled: boolean;
  /**
   * Localhost + `helixLab`: use Julia tube fragment shader (`uMode > 1.5`); when false, solid additive ribbons.
   */
  wormholeHelixJuliaRibbonShaderEnabled: boolean;
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
  wormholeBlackHoleOverlayEnabled: false,
  wormholeCoinClickTunnelBoost: false,
  wormholeCoinFadeOnScrollForward: true,
  wormholeAtmosphereOverlayEnabled: true,
  wormholeHelixJuliaRibbonShaderEnabled: true,
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
