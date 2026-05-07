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
  /** `/wormhole` — coin fog overlay (tunnel debug panel). */
  wormholeCoinFogEnabled: boolean;
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
  /** Tunnel debug — show `BlackHoleOverlay` under the hero coin on wormhole lab routes. */
  wormholeBlackHoleOverlayEnabled: boolean;
  /**
   * Production home intro: when non-null, {@link useScrollDepth} applies this depth and zero
   * velocity each tick instead of integrating scroll (pan/zoom settle before hand-off).
   */
  wormholeIntroDepthOverride: number | null;
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
  bloomThreshold: 0.18,
  wormholeCoinVisible: true,
  wormholeCoinFogEnabled: false,
  wormhole3dBackgroundEnabled: true,
  wormholeHelices3dEnabled: true,
  wormholeScrollVisualMul: 1,
  wormholeScrollHelixVelGain: 0,
  wormholeDebugRandomCamTilt: false,
  wormholeBlackHoleOverlayEnabled: false,
  wormholeIntroDepthOverride: null,
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
