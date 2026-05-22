'use client';

import type { ReactElement } from 'react';

import type { WormholeAtmospherePreset } from '@/tunnel/wormholeAtmospherePreset';

export type Wormhole4AtmosphereOverlayProps = {
  /**
   * Production `/`: lighter edge vignette so fullscreen helices read to the frame without the
   * overlay eating perceived tunnel extent.
   */
  fullscreenBleed?: boolean;
  /** Active look — never `'off'` when this component mounts (gate handles that). */
  preset: Exclude<WormholeAtmospherePreset, 'off'>;
};

type GradientSet = {
  vertical: string;
  radial: string;
  chroma: string;
  bottom: string;
  chromaBlendClass: string;
};

function gradientsFor(
  preset: Exclude<WormholeAtmospherePreset, 'off'>,
  fullscreenBleed: boolean,
): GradientSet {
  if (preset === 'nebula') {
    return {
      vertical: fullscreenBleed
        ? 'linear-gradient(180deg, rgba(6,8,26,0.38) 0%, rgba(6,8,26,0.08) 14%, transparent 28%, transparent 72%, rgba(4,2,14,0.08) 86%, rgba(4,2,14,0.36) 100%)'
        : 'linear-gradient(180deg, rgba(6,8,26,0.62) 0%, rgba(6,8,26,0.14) 14%, transparent 30%, transparent 70%, rgba(4,2,14,0.14) 86%, rgba(4,2,14,0.58) 100%)',
      radial: fullscreenBleed
        ? 'radial-gradient(ellipse 98% 94% at 50% 44%, transparent 0%, transparent 52%, rgba(2,0,10,0.09) 64%, rgba(0,0,0,0.26) 100%)'
        : 'radial-gradient(ellipse 96% 92% at 50% 44%, transparent 0%, transparent 40%, rgba(2,0,10,0.14) 58%, rgba(0,0,0,0.48) 100%)',
      chroma: fullscreenBleed
        ? 'radial-gradient(ellipse 52% 96% at 0% 50%, rgba(130,90,255,0.26) 0%, transparent 55%), radial-gradient(ellipse 52% 96% at 100% 50%, rgba(50,190,210,0.18) 0%, transparent 55%)'
        : 'radial-gradient(ellipse 52% 96% at 0% 50%, rgba(130,90,255,0.42) 0%, transparent 55%), radial-gradient(ellipse 52% 96% at 100% 50%, rgba(50,190,210,0.3) 0%, transparent 55%)',
      bottom: fullscreenBleed
        ? 'linear-gradient(0deg, rgba(12,4,28,0.28) 0%, rgba(12,4,28,0.05) 18%, transparent 32%)'
        : 'linear-gradient(0deg, rgba(12,4,28,0.5) 0%, rgba(12,4,28,0.08) 18%, transparent 32%)',
      chromaBlendClass: 'mix-blend-soft-light',
    };
  }

  if (preset === 'ember') {
    return {
      vertical: fullscreenBleed
        ? 'linear-gradient(180deg, rgba(42,12,8,0.42) 0%, rgba(42,12,8,0.1) 16%, transparent 30%, transparent 70%, rgba(28,6,4,0.1) 84%, rgba(28,6,4,0.4) 100%)'
        : 'linear-gradient(180deg, rgba(52,14,8,0.68) 0%, rgba(52,14,8,0.18) 14%, transparent 30%, transparent 70%, rgba(36,8,4,0.16) 86%, rgba(36,8,4,0.62) 100%)',
      radial: fullscreenBleed
        ? 'radial-gradient(ellipse 97% 93% at 50% 45%, transparent 0%, transparent 50%, rgba(60,12,4,0.12) 62%, rgba(8,2,0,0.38) 100%)'
        : 'radial-gradient(ellipse 95% 91% at 50% 45%, transparent 0%, transparent 38%, rgba(80,20,8,0.2) 56%, rgba(4,0,0,0.52) 100%)',
      chroma: fullscreenBleed
        ? 'radial-gradient(ellipse 48% 94% at 0% 48%, rgba(255,120,40,0.22) 0%, transparent 52%), radial-gradient(ellipse 48% 94% at 100% 52%, rgba(200,40,90,0.16) 0%, transparent 52%)'
        : 'radial-gradient(ellipse 48% 94% at 0% 48%, rgba(255,140,60,0.38) 0%, transparent 52%), radial-gradient(ellipse 48% 94% at 100% 52%, rgba(220,50,100,0.28) 0%, transparent 52%)',
      bottom: fullscreenBleed
        ? 'linear-gradient(0deg, rgba(48,10,6,0.32) 0%, rgba(48,10,6,0.06) 20%, transparent 34%)'
        : 'linear-gradient(0deg, rgba(56,12,6,0.52) 0%, rgba(56,12,6,0.1) 18%, transparent 34%)',
      chromaBlendClass: 'mix-blend-soft-light',
    };
  }

  if (preset === 'glacier') {
    return {
      vertical: fullscreenBleed
        ? 'linear-gradient(180deg, rgba(4,18,42,0.44) 0%, rgba(4,18,42,0.1) 15%, transparent 29%, transparent 71%, rgba(2,12,36,0.1) 85%, rgba(2,12,36,0.38) 100%)'
        : 'linear-gradient(180deg, rgba(4,22,52,0.7) 0%, rgba(4,22,52,0.16) 14%, transparent 30%, transparent 70%, rgba(2,14,40,0.15) 86%, rgba(2,14,40,0.6) 100%)',
      radial: fullscreenBleed
        ? 'radial-gradient(ellipse 98% 94% at 50% 44%, transparent 0%, transparent 52%, rgba(0,40,80,0.14) 64%, rgba(0,4,16,0.42) 100%)'
        : 'radial-gradient(ellipse 96% 92% at 50% 44%, transparent 0%, transparent 40%, rgba(0,60,100,0.22) 58%, rgba(0,2,12,0.55) 100%)',
      chroma: fullscreenBleed
        ? 'radial-gradient(ellipse 50% 96% at 0% 50%, rgba(40,200,255,0.2) 0%, transparent 54%), radial-gradient(ellipse 50% 96% at 100% 50%, rgba(80,140,255,0.18) 0%, transparent 54%)'
        : 'radial-gradient(ellipse 50% 96% at 0% 50%, rgba(50,220,255,0.36) 0%, transparent 54%), radial-gradient(ellipse 50% 96% at 100% 50%, rgba(100,160,255,0.3) 0%, transparent 54%)',
      bottom: fullscreenBleed
        ? 'linear-gradient(0deg, rgba(6,28,56,0.3) 0%, rgba(6,28,56,0.05) 19%, transparent 33%)'
        : 'linear-gradient(0deg, rgba(6,32,64,0.5) 0%, rgba(6,32,64,0.08) 18%, transparent 33%)',
      chromaBlendClass: 'mix-blend-soft-light',
    };
  }

  /* corona */
  return {
    vertical: fullscreenBleed
      ? 'linear-gradient(180deg, rgba(18,10,32,0.36) 0%, rgba(18,10,32,0.08) 14%, transparent 28%, transparent 72%, rgba(10,6,22,0.08) 86%, rgba(10,6,22,0.34) 100%)'
      : 'linear-gradient(180deg, rgba(22,12,38,0.58) 0%, rgba(22,12,38,0.14) 14%, transparent 30%, transparent 70%, rgba(12,6,26,0.14) 86%, rgba(12,6,26,0.56) 100%)',
    radial: fullscreenBleed
      ? 'radial-gradient(ellipse 96% 92% at 50% 42%, transparent 0%, transparent 46%, rgba(255,200,120,0.08) 58%, rgba(0,0,0,0.28) 100%)'
      : 'radial-gradient(ellipse 94% 90% at 50% 42%, transparent 0%, transparent 34%, rgba(255,210,140,0.14) 52%, rgba(0,0,0,0.5) 100%)',
    chroma: fullscreenBleed
      ? 'radial-gradient(ellipse 46% 92% at 0% 48%, rgba(255,200,90,0.2) 0%, transparent 56%), radial-gradient(ellipse 46% 92% at 100% 52%, rgba(180,90,255,0.16) 0%, transparent 56%)'
      : 'radial-gradient(ellipse 46% 92% at 0% 48%, rgba(255,220,110,0.34) 0%, transparent 56%), radial-gradient(ellipse 46% 92% at 100% 52%, rgba(200,100,255,0.26) 0%, transparent 56%)',
    bottom: fullscreenBleed
      ? 'linear-gradient(0deg, rgba(28,14,48,0.26) 0%, rgba(28,14,48,0.05) 18%, transparent 32%)'
      : 'linear-gradient(0deg, rgba(32,16,54,0.46) 0%, rgba(32,16,54,0.08) 18%, transparent 32%)',
    chromaBlendClass: 'mix-blend-screen',
  };
}

/**
 * Non-interactive gradient stack on top of the Three.js tunnel: **clear in the center** so the
 * throat reads unobstructed, with a gradual fade to atmospheric tint / vignette toward the edges.
 */
export function Wormhole4AtmosphereOverlay({
  fullscreenBleed = false,
  preset,
}: Wormhole4AtmosphereOverlayProps): ReactElement {
  const g = gradientsFor(preset, fullscreenBleed);

  /** ~50% more transparent overall (presets share the same stack structure). */
  const OVERLAY_OPACITY = 0.5;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[3] h-[100dvh] w-screen overflow-hidden"
      style={{ opacity: OVERLAY_OPACITY }}
    >
      <div className="absolute inset-0" style={{ background: g.vertical }} />
      <div className="absolute inset-0" style={{ background: g.radial }} />
      <div className={`absolute inset-0 ${g.chromaBlendClass}`} style={{ background: g.chroma }} />
      <div className="absolute inset-0" style={{ background: g.bottom }} />
    </div>
  );
}
