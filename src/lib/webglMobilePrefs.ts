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
  if (isIOSLike()) return 'default';
  return window.matchMedia('(pointer: coarse)').matches ? 'default' : 'high-performance';
}

/** Full-viewport tunnel: disable MSAA on coarse / iOS to reduce GPU load. */
export function webglWormholeAntialias(): boolean {
  if (typeof window === 'undefined') return true;
  if (isIOSLike()) return false;
  return !window.matchMedia('(pointer: coarse)').matches;
}

/** Cap DPR for the wormhole renderer (memory + iOS stability). */
export function webglWormholePixelRatio(devicePixelRatio: number): number {
  const cap = isIOSLike() ? 1 : 2;
  return Math.min(Math.max(1, devicePixelRatio || 1), cap);
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
