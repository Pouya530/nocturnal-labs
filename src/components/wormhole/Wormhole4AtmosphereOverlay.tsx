'use client';

import type { ReactElement } from 'react';

export type Wormhole4AtmosphereOverlayProps = {
  /**
   * Production `/`: lighter edge vignette so fullscreen helices read to the frame without the
   * overlay eating perceived tunnel extent.
   */
  fullscreenBleed?: boolean;
};

/**
 * Non-interactive gradient stack on top of the Three.js tunnel: **clear in the center** so the
 * throat reads unobstructed, with a gradual fade to atmospheric tint / vignette toward the edges.
 */
export function Wormhole4AtmosphereOverlay({
  fullscreenBleed = false,
}: Wormhole4AtmosphereOverlayProps): ReactElement {
  const verticalGradient = fullscreenBleed
    ? 'linear-gradient(180deg, rgba(6,8,26,0.38) 0%, rgba(6,8,26,0.08) 14%, transparent 28%, transparent 72%, rgba(4,2,14,0.08) 86%, rgba(4,2,14,0.36) 100%)'
    : 'linear-gradient(180deg, rgba(6,8,26,0.62) 0%, rgba(6,8,26,0.14) 14%, transparent 30%, transparent 70%, rgba(4,2,14,0.14) 86%, rgba(4,2,14,0.58) 100%)';

  const radialGradient = fullscreenBleed
    ? 'radial-gradient(ellipse 98% 94% at 50% 44%, transparent 0%, transparent 52%, rgba(2,0,10,0.09) 64%, rgba(0,0,0,0.26) 100%)'
    : 'radial-gradient(ellipse 96% 92% at 50% 44%, transparent 0%, transparent 40%, rgba(2,0,10,0.14) 58%, rgba(0,0,0,0.48) 100%)';

  const chromaGradient = fullscreenBleed
    ? 'radial-gradient(ellipse 52% 96% at 0% 50%, rgba(130,90,255,0.26) 0%, transparent 55%), radial-gradient(ellipse 52% 96% at 100% 50%, rgba(50,190,210,0.18) 0%, transparent 55%)'
    : 'radial-gradient(ellipse 52% 96% at 0% 50%, rgba(130,90,255,0.42) 0%, transparent 55%), radial-gradient(ellipse 52% 96% at 100% 50%, rgba(50,190,210,0.3) 0%, transparent 55%)';

  const bottomBandGradient = fullscreenBleed
    ? 'linear-gradient(0deg, rgba(12,4,28,0.28) 0%, rgba(12,4,28,0.05) 18%, transparent 32%)'
    : 'linear-gradient(0deg, rgba(12,4,28,0.5) 0%, rgba(12,4,28,0.08) 18%, transparent 32%)';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2] h-[100dvh] w-screen overflow-hidden"
    >
      {/* Vertical: transparent mid-band; gentle falloff toward top and bottom only */}
      <div className="absolute inset-0" style={{ background: verticalGradient }} />
      {/* Radial vignette: fully transparent core → soft haze → darker rim */}
      <div className="absolute inset-0" style={{ background: radialGradient }} />
      {/* Edge chroma: kept narrow so the middle stays clean */}
      <div className="absolute inset-0 mix-blend-soft-light" style={{ background: chromaGradient }} />
      {/* Bottom band only — fades out well before the vertical midline */}
      <div className="absolute inset-0" style={{ background: bottomBandGradient }} />
    </div>
  );
}
