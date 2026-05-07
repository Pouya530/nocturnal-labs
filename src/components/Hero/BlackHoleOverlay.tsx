'use client';

import type { ReactElement } from 'react';

/**
 * Radial "black hole" overlay sitting between the fractal backdrop and the coin.
 * Opaque black core; very light tinted annulus + long feather; stacked rim gradient + soft
 * box-shadow for edge glow. Sized via --hero-logo-size (~3.4× coin).
 */
export function BlackHoleOverlay(): ReactElement {
  return (
    <div
      aria-hidden
      className="black-hole-overlay pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    />
  );
}
