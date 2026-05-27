/**
 * Touch-primary / phone scroll tuning for production home (`/` → {@link Wormhole6ClientShell}).
 * Desktop wormhole labs keep longer coast; mobile needs snappier reversal after ring exit.
 *
 * Viewport probe is local (not {@link webglMobilePrefs}) to avoid a module cycle:
 * `wormholeScrollMobile` → `webglMobilePrefs` → `wormholePageConfig` → tunnel chunks.
 */
function isCoarseOrTouchPrimaryViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  if (window.matchMedia('(hover: none)').matches && (navigator.maxTouchPoints ?? 0) > 0) {
    return true;
  }
  return false;
}

export function isWormholeTouchScrollPrimary(): boolean {
  return isCoarseOrTouchPrimaryViewport();
}

/**
 * Extra finger-pan / touch scroll gain on phones and touch-primary tablets only.
 * Applied in {@link useScrollDepth} (`/` index + wormhole routes); desktop wheel unchanged.
 */
export const WORMHOLE_MOBILE_TOUCH_SCROLL_SENS_MUL = 1.36;

export function wormholeMobileTouchScrollSensMul(): number {
  return isWormholeTouchScrollPrimary() ? WORMHOLE_MOBILE_TOUCH_SCROLL_SENS_MUL : 1;
}

/** Coast e-folding time (seconds) — locked/free velocity decay from prior impulse. */
export function wormholeScrollCoastTauSec(): number {
  return isWormholeTouchScrollPrimary() ? 14 : 72;
}

/** Extra settle toward v=0 when hands are off (1/s). */
export function wormholeScrollVelSettlePerSec(): number {
  return isWormholeTouchScrollPrimary() ? 3.8 : 2.15;
}

/** Locked-mode reversal brake when finger pan opposes current velocity (1/s). */
export function wormholeScrollReversalBrakePerSec(): number {
  return isWormholeTouchScrollPrimary() ? 34 : 11;
}

export function wormholeScrollReversalImpulseMul(): number {
  return isWormholeTouchScrollPrimary() ? 1.38 : 1.22;
}

/**
 * Effective friction coeff for `Math.pow(friction, dt*8)`. Mobile: do not add +0.06 (that slowed decay).
 */
export function wormholeScrollFrictionEffective(storeFriction: number): number {
  if (isWormholeTouchScrollPrimary()) {
    return Math.max(0.84, storeFriction - 0.03);
  }
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return storeFriction;
  }
  const ua = navigator.userAgent;
  const desktopSafari =
    /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
  const chromium = /Chrome\//.test(ua) || /Chromium\//.test(ua) || /Edg\//.test(ua);
  if (desktopSafari) return storeFriction;
  if (chromium) return Math.min(0.99, storeFriction + 0.06);
  return storeFriction;
}

/** Mouth journey FOV add cap (degrees) on touch-primary — home starts inside intro band. */
export const WORMHOLE_MOBILE_MOUTH_FOV_ADD_CAP = 8.5;

/** Mouth journey camera Z pull cap (world units) on touch-primary. */
export const WORMHOLE_MOBILE_MOUTH_CAM_Z_CAP = 5.75;

/**
 * Tunnel camera velocity ride on touch-primary — stronger than legacy desktop
 * (`0.65` / `8` FOV, `0.16` / `1` dolly, `0.005` / `0.032` bank in {@link JuliaWormholeBackdrop}).
 */
export const WORMHOLE_MOBILE_CAM_VEL_FOV_MUL = 0.9;
export const WORMHOLE_MOBILE_CAM_VEL_FOV_CAP = 10.5;
export const WORMHOLE_MOBILE_CAM_VEL_DOLLY_MUL = 0.22;
export const WORMHOLE_MOBILE_CAM_VEL_DOLLY_CAP = 1.35;
export const WORMHOLE_MOBILE_CAM_VEL_BANK_MUL = 0.0072;
export const WORMHOLE_MOBILE_CAM_VEL_BANK_CAP = 0.044;
/** FOV chase rate (1/s) — slightly snappier on finger pan. */
export const WORMHOLE_MOBILE_CAM_VEL_FOV_EASE = 9.5;
export const WORMHOLE_MOBILE_CAM_VEL_DOLLY_EASE = 5.2;
export const WORMHOLE_MOBILE_CAM_VEL_BANK_EASE = 3.8;
