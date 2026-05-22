import * as THREE from 'three';

/** Matches `tunnelStore.zoomRate` debug baseline (see `DebugTunnelPanel`). */
export const ZOOM_RATE_BASE = 0.25;

/**
 * Scroll-zoom strength vs debug baseline (`zoomRate / ZOOM_RATE_BASE`).
 * Compressed for 3D journey so `zoomRate: 1000` stays dramatic but stable.
 */
export function tunnelZoomMul(zoomRate: number): number {
  const raw = Math.max(0, zoomRate) / ZOOM_RATE_BASE;
  return THREE.MathUtils.clamp(Math.pow(raw, 0.38), 1, 28);
}
