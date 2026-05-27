/**
 * Tunnel + hero coin cameras track scroll depth like {@link WormholeCoinDepthScale}:
 * as the coin shrinks, the shot dollies into the tube for a stronger journey read.
 */

/** Matches `WormholeCoinDepthScale` — 50% scale at max depth. */
export function wormholeCoinScaleFromDepth(depth: number, maxDepth: number): number {
  const max = Math.max(1, maxDepth);
  const linearNorm = Math.min(1, Math.max(0, depth / max));
  const eased = Math.sqrt(linearNorm);
  return 1 - 0.5 * eased;
}

/** 0 at mouth → 1 at full shrink (same easing as depth scale). */
export function wormholeCoinShrink01(depth: number, maxDepth: number): number {
  return 1 - wormholeCoinScaleFromDepth(depth, maxDepth);
}

export type WormholeCoinFollowCamParams = {
  enabled: boolean;
  strength: number;
  depth: number;
  maxDepth: number;
  /** Tunnel scroll velocity; positive = into the journey (coin shrinking). */
  velocity: number;
};

export type WormholeCoinFollowCamOffsets = {
  /** Extra tunnel camera Z (negative = forward into the tube). */
  dollyZ: number;
  /** Extra FOV delta (negative = narrower / push-in feel). */
  fovAdd: number;
  shrink01: number;
};

/** Defaults for tunnel debug sliders (`strength` 1 = these). */
export const WORMHOLE_COIN_FOLLOW_CAM_TUNNEL = {
  maxDolly: 3.2,
  maxFov: 6.5,
  velDolly: 0.55,
  velFov: 2.4,
  velRef: 32,
} as const;

/** Hero coin GL camera — smaller deltas, same shrink signal. */
export const WORMHOLE_COIN_FOLLOW_CAM_HERO = {
  maxDolly: 1.15,
  maxFov: 5.5,
  velDolly: 0.38,
  velFov: 3.2,
  velRef: 32,
} as const;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function forwardVel01(velocity: number, velRef: number): number {
  return smoothstep(0, velRef, velocity);
}

type CoinFollowCamTuning = {
  maxDolly: number;
  maxFov: number;
  velDolly: number;
  velFov: number;
  velRef: number;
};

export function computeWormholeCoinFollowCam(
  params: WormholeCoinFollowCamParams,
  tuning: CoinFollowCamTuning = WORMHOLE_COIN_FOLLOW_CAM_TUNNEL,
): WormholeCoinFollowCamOffsets {
  const shrink01 = wormholeCoinShrink01(params.depth, params.maxDepth);
  if (!params.enabled || params.strength <= 0) {
    return { dollyZ: 0, fovAdd: 0, shrink01 };
  }

  const k = Math.max(0, Math.min(2, params.strength));
  const depthDolly = -shrink01 * k * tuning.maxDolly;
  const depthFov = -shrink01 * k * tuning.maxFov;

  const fwd = forwardVel01(params.velocity, tuning.velRef);
  const velDolly = -fwd * k * tuning.velDolly;
  const velFov = -fwd * k * tuning.velFov;

  return {
    dollyZ: depthDolly + velDolly,
    fovAdd: depthFov + velFov,
    shrink01,
  };
}

export function computeHeroCoinFollowCam(
  params: WormholeCoinFollowCamParams,
): WormholeCoinFollowCamOffsets {
  return computeWormholeCoinFollowCam(params, WORMHOLE_COIN_FOLLOW_CAM_HERO);
}
