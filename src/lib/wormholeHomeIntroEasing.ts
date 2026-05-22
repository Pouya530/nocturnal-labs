/**
 * Home (`/`) post-preloader depth pullback: fast zoom-out early, soft settle at mouth (`0`).
 * Journey / backdrop cam (`wormholeHomeIntroCam01`) tracks depth progress and finishes slightly earlier.
 */

import {
  WORMHOLE_HOME_INTRO_CAM_AT_DEPTH_EASED,
  WORMHOLE_HOME_INTRO_DEPTH_FAST_DISTANCE_FRAC,
  WORMHOLE_HOME_INTRO_DEPTH_FAST_TIME_FRAC,
} from '@/lib/wormholePageConfig';

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

function easeOutQuint(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 5;
}

function easeOutQuad(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 2;
}

function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
}

/** Normalized time `k` (0–1) → eased depth progress (0–1): most travel early, long ease into mouth. */
export function wormholeHomeIntroDepthEased(k: number): number {
  const t = clamp01(k);
  const fastT = WORMHOLE_HOME_INTRO_DEPTH_FAST_TIME_FRAC;
  const fastD = WORMHOLE_HOME_INTRO_DEPTH_FAST_DISTANCE_FRAC;
  if (t <= fastT) {
    const u = t / fastT;
    return fastD * easeOutQuad(u);
  }
  const u = (t - fastT) / (1 - fastT);
  return fastD + (1 - fastD) * easeOutQuint(u);
}

/** Depth eased progress → journey / coin GL intro cam (0–1), completes before depth fully settles. */
export function wormholeHomeIntroCam01FromDepthEased(depthEased: number): number {
  const t = clamp01(depthEased / WORMHOLE_HOME_INTRO_CAM_AT_DEPTH_EASED);
  return easeOutCubic(t);
}

/** Logo stage-reveal: fast settle (ease-out expo) after the tunnel leads. */
export function wormholeHomeIntroLogoEased(linear: number): number {
  return easeOutExpo(linear);
}

/** When true, logo Z uses CSS `--stage-reveal-progress` instead of per-frame JS (dev uses JS). */
export function wormholeHomeIntroFreezeTranslateZOnProduction(): boolean {
  return false;
}
