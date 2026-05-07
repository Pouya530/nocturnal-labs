'use client';

import type { CSSProperties, ReactElement } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import { tunnelStore } from '@/tunnel/tunnelStore';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Same accent hues as `JuliaWormholeBackdrop` PALETTE — reads as bloom-coloured haze
 * (additive passes), not a dark vignette.
 */
/** Long outer feather (multi-stop) so halos dissolve into the scene — no hard disc edge. */
const BLOOM_FOG_LAYERS: readonly string[] = [
  'radial-gradient(ellipse 58% 62% at 44% 45%, rgba(255, 77, 168, 0.62) 0%, rgba(255, 77, 168, 0.28) 38%, rgba(255, 77, 168, 0.08) 72%, rgba(255, 77, 168, 0.02) 90%, transparent 100%)',
  'radial-gradient(ellipse 52% 56% at 58% 52%, rgba(142, 59, 255, 0.55) 0%, rgba(142, 59, 255, 0.24) 36%, rgba(142, 59, 255, 0.07) 70%, rgba(142, 59, 255, 0.02) 88%, transparent 100%)',
  'radial-gradient(ellipse 54% 58% at 48% 58%, rgba(59, 123, 255, 0.5) 0%, rgba(59, 123, 255, 0.22) 37%, rgba(59, 123, 255, 0.06) 71%, rgba(59, 123, 255, 0.02) 89%, transparent 100%)',
  'radial-gradient(ellipse 46% 50% at 38% 56%, rgba(77, 255, 176, 0.38) 0%, rgba(77, 255, 176, 0.16) 35%, rgba(77, 255, 176, 0.05) 69%, rgba(77, 255, 176, 0.015) 87%, transparent 100%)',
  'radial-gradient(ellipse 42% 48% at 62% 42%, rgba(245, 255, 97, 0.32) 0%, rgba(245, 255, 97, 0.14) 34%, rgba(245, 255, 97, 0.045) 68%, rgba(245, 255, 97, 0.012) 86%, transparent 100%)',
];

/**
 * Soft veil so “fog” still occludes slightly (bloom + thin atmospheric read).
 * Matches scene fog tint `0x05010f`.
 */
const ATMOSPHERE_GRADIENT =
  'radial-gradient(ellipse 92% 94% at 50% 50%, rgba(5, 1, 15, 0) 22%, rgba(5, 1, 15, 0.22) 52%, rgba(5, 1, 15, 0.4) 72%, rgba(5, 1, 15, 0.12) 88%, rgba(5, 1, 15, 0) 100%)';

/** Unified alpha disc: center opaque → outer fully soft (pairs with widened `inset`). */
const FOG_OUTER_MASK =
  'radial-gradient(ellipse 100% 100% at 50% 50%, #000 0%, #000 40%, rgba(0,0,0,0.62) 66%, rgba(0,0,0,0.22) 84%, rgba(0,0,0,0.06) 94%, transparent 100%)';

const LAYER_WEIGHTS = [1, 0.92, 0.88, 0.72, 0.65] as const;

/**
 * Bloom-like mist over the hero coin on `/wormhole`: blurred additive colour halos + light
 * depth veil, scaled by `bloomStrength` / `bloomRadius` (same sliders as Three.js
 * `UnrealBloomPass`). Toggled via `wormholeCoinFogEnabled`.
 */
export function WormholeCoinFogOverlay(): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const atmoRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sync = () => {
      const root = rootRef.current;
      if (!root) return;

      const s = tunnelStore.getState();
      if (!s.wormholeCoinFogEnabled) {
        root.style.opacity = '0';
        root.style.visibility = 'hidden';
        return;
      }

      root.style.visibility = 'visible';
      root.style.opacity = '1';

      const reduced = motionPrefs.reduced ? 0.38 : 1;
      const strength = clamp(s.bloomStrength, 0, 2.5);
      const radius = clamp(s.bloomRadius, 0, 1.5);

      const gain = (0.26 + strength * 0.44) * reduced;
      const blurPx = 5 + radius * 26;

      root.style.setProperty('--bf-blur', `${blurPx}px`);

      const layers = root.querySelectorAll<HTMLElement>('[data-bloom-fog-layer]');
      layers.forEach((el, i) => {
        const w = LAYER_WEIGHTS[i] ?? 0.6;
        el.style.opacity = String(clamp(gain * w, 0, 1));
      });

      const atmo = atmoRef.current;
      if (atmo) {
        const atmoOp = (0.18 + strength * 0.15) * reduced * 0.85;
        atmo.style.opacity = String(clamp(atmoOp, 0, 0.72));
      }
    };

    sync();
    const unsub = tunnelStore.subscribe(sync);
    return () => {
      unsub();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-[-52%] z-[8] overflow-visible rounded-[50%] opacity-0 [mask-image:var(--bf-outer-mask)] [-webkit-mask-image:var(--bf-outer-mask)] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] [mask-size:100%_100%] [-webkit-mask-size:100%_100%]"
      style={
        {
          visibility: 'hidden',
          '--bf-outer-mask': FOG_OUTER_MASK,
        } as CSSProperties
      }
    >
      {/* Thin depth veil under additive bloom halos */}
      <div
        ref={atmoRef}
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: ATMOSPHERE_GRADIENT,
          mixBlendMode: 'normal',
          opacity: 0,
        }}
      />
      {BLOOM_FOG_LAYERS.map((bg, i) => (
        <div
          key={i}
          data-bloom-fog-layer
          className="absolute inset-0 rounded-[50%] will-change-[opacity,filter]"
          style={{
            mixBlendMode: 'plus-lighter',
            filter: 'blur(var(--bf-blur, 24px))',
            WebkitFilter: 'blur(var(--bf-blur, 24px))',
            background: bg,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
