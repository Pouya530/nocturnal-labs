/** Shader mix for tunnel rings — subtle cylindrical wrap on flat RingGeometry (localhost only). */
export const WORMHOLE_DEV_RING_CYL_LOOK = 0.68;

/**
 * Local dev ring shading — disabled (0): the cylindrical banding read as concentric “imprints”
 * on the radial background behind the coin. Flat Julia rings only.
 */
export function wormholeDevRingCylinderLook(): number {
  return 0;
}
