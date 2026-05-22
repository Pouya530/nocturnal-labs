import {
  WORMHOLE_DESKTOP_PRODUCTION_DPR_FLOOR,
  WORMHOLE_DESKTOP_PRODUCTION_DPR_MAX,
} from '@/lib/wormholePageConfig';
import { wormholeDesktopProductionHighQuality } from '@/lib/wormholeProductionQuality';

/**
 * iOS / iPadOS WebKit: prefer conservative WebGL; post-processing + high DPR often black-screens
 * or fails context creation. iPad "Request Desktop Website" reports MacIntel + touch points.
 */
export function isIOSLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iP(hone|ad|od)/i.test(navigator.userAgent ?? '')) return true;
  if (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) {
    if (navigator.platform === 'MacIntel') return true;
  }
  return false;
}

/**
 * On phones / coarse pointers, `high-performance` can prevent a WebGL context on some GPUs.
 * `default` lets the browser pick a working config.
 */
export function webglPowerPreference(): 'default' | 'high-performance' {
  if (typeof window === 'undefined') return 'high-performance';
  if (wormholeDesktopProductionHighQuality()) return 'high-performance';
  if (isIOSLike()) return 'default';
  return window.matchMedia('(pointer: coarse)').matches ? 'default' : 'high-performance';
}

/** Full-viewport tunnel: disable MSAA on coarse / iOS to reduce GPU load. */
export function webglWormholeAntialias(): boolean {
  if (typeof window === 'undefined') return true;
  if (wormholeDesktopProductionHighQuality()) return true;
  if (isIOSLike()) return false;
  return !window.matchMedia('(pointer: coarse)').matches;
}

/** Cap DPR for the wormhole renderer (memory + iOS stability). */
export function webglWormholePixelRatio(devicePixelRatio: number): number {
  const dpr = Math.max(1, devicePixelRatio || 1);
  if (wormholeDesktopProductionHighQuality()) {
    return Math.min(
      Math.max(dpr, WORMHOLE_DESKTOP_PRODUCTION_DPR_FLOOR),
      WORMHOLE_DESKTOP_PRODUCTION_DPR_MAX,
    );
  }
  const cap = isIOSLike() ? 1 : 2;
  return Math.min(dpr, cap);
}

/**
 * Logo coin R3F canvas only: small framebuffer — multisample AA is cheap and softens silhouette /
 * rim aliasing on retina (full-screen tunnel still uses {@link webglWormholeAntialias}).
 */
export function webglCoinAntialias(): boolean {
  return true;
}

/**
 * iOS was using DPR 1 on the coin to match conservative tunnel tuning; that makes the mark look
 * pixelated on 2×/3× iPhone. Cap at 2 — sharp enough, lighter than uncapped 3×.
 */
export function webglCoinCanvasDpr(devicePixelRatio: number): number | [number, number] {
  const dpr = Math.max(1, devicePixelRatio || 1);
  if (wormholeDesktopProductionHighQuality()) {
    return Math.min(
      Math.max(dpr, WORMHOLE_DESKTOP_PRODUCTION_DPR_FLOOR),
      WORMHOLE_DESKTOP_PRODUCTION_DPR_MAX,
    );
  }
  if (isIOSLike()) {
    return Math.min(2, dpr);
  }
  return [1, 2];
}

/**
 * Tunnel scroll defaults: phones / tablets where finger pan drives depth (not desktop + trackpad).
 * `(hover: none) + touch` covers some browsers that omit `(pointer: coarse)`.
 */
export function isCoarseOrTouchPrimaryViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  if (window.matchMedia('(hover: none)').matches && (navigator.maxTouchPoints ?? 0) > 0) {
    return true;
  }
  return false;
}

/** Tailwind `max-md` — wormhole post tweaks (e.g. helix bloom) on phones / small tablets. */
export function wormholeNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/**
 * Julia ring stack + tunnel ambience (stars, motes, sky tessellation) — does not change helix path
 * density, tube segments, or helix shader uniforms.
 */
export function wormholeTunnelRingsMaxQuality(): boolean {
  if (typeof window === 'undefined') return true;
  if (isIOSLike()) return false;
  if (isCoarseOrTouchPrimaryViewport()) return false;
  return true;
}
