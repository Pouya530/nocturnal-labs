/**
 * Slight camera look-at offset from pointer on journey/throat routes (`JuliaWormholeBackdrop`).
 * Does not affect scroll depth — only scales `camera.lookAt` target XY.
 */
export const WORMHOLE_JOURNEY_MOUSE_PARALLAX_MODES = ['full', 'subtle', 'off'] as const;

export type WormholeJourneyMouseParallaxMode = (typeof WORMHOLE_JOURNEY_MOUSE_PARALLAX_MODES)[number];

export const WORMHOLE_JOURNEY_MOUSE_PARALLAX_LABELS: Record<
  WormholeJourneyMouseParallaxMode,
  string
> = {
  full: 'Full',
  subtle: 'Subtle',
  off: 'Off',
};

/** Multiplier applied to default look-at XY gain (0.64 / 0.42). */
export function journeyMouseParallaxMul(
  mode: WormholeJourneyMouseParallaxMode | undefined,
): number {
  if (mode === 'off') return 0;
  if (mode === 'subtle') return 0.42;
  return 1;
}
