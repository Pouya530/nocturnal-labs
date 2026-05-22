import { isLocalhostHostname } from '@/lib/isLocalhost';

/** Shader mix for tunnel rings — subtle cylindrical wrap on flat RingGeometry (localhost only). */
export const WORMHOLE_DEV_RING_CYL_LOOK = 0.68;

/** Local dev (`localhost:3001`) — extra ring shading, not geometry changes. */
export function wormholeDevRingCylinderLook(): number {
  if (typeof window === 'undefined') return 0;
  return isLocalhostHostname(window.location.hostname) ? WORMHOLE_DEV_RING_CYL_LOOK : 0;
}
