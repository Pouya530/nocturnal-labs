'use client';

import type { ReactElement } from 'react';

/**
 * `/wormhole4` only — non-interactive stack of gradients on top of the Three.js tunnel to add
 * depth, vignette, and a hint of lateral color so the void reads more atmospheric and dimensional.
 */
export function Wormhole4AtmosphereOverlay(): ReactElement {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2] h-[100dvh] w-screen overflow-hidden"
    >
      {/* Vertical depth: overhead falloff → mid tunnel haze → floor shadow */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,8,26,0.78) 0%, rgba(14,10,36,0.22) 40%, rgba(20,12,48,0.28) 68%, rgba(4,2,14,0.58) 100%)',
        }}
      />
      {/* Radial tunnel: brighter throat read, darker rim (parallax-style framing) */}
      <div
        className="absolute inset-0 opacity-[0.72]"
        style={{
          background:
            'radial-gradient(ellipse 92% 88% at 50% 44%, rgba(255,248,255,0.04) 0%, transparent 28%, rgba(2,0,10,0.18) 55%, rgba(0,0,0,0.58) 100%)',
        }}
      />
      {/* Edge chroma: soft violet / teal on sides for stereo / lens atmosphere */}
      <div
        className="absolute inset-0 opacity-[0.38] mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 0% 48%, rgba(130,90,255,0.35) 0%, transparent 45%), radial-gradient(ellipse 70% 90% at 100% 52%, rgba(50,190,210,0.22) 0%, transparent 45%)',
        }}
      />
      {/* Near-field haze band — grounds the scene in 3D space */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          background: 'linear-gradient(0deg, rgba(12,4,28,0.55) 0%, transparent 32%)',
        }}
      />
    </div>
  );
}
