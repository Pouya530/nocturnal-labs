'use client';

import type { CSSProperties, ReactElement } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import { tunnelStore } from '@/tunnel/tunnelStore';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Same accents as `JuliaWormholeBackdrop` PALETTE — interpolated over time when fog is on. */
const PALETTE_RGB: readonly [number, number, number][] = [
  [255, 77, 168],
  [142, 59, 255],
  [59, 123, 255],
  [77, 255, 176],
  [245, 255, 97],
];

const LAYER_LAYOUT = [
  { ew: 58, eh: 62, cx: 44, cy: 45 },
  { ew: 52, eh: 56, cx: 58, cy: 52 },
  { ew: 54, eh: 58, cx: 48, cy: 58 },
  { ew: 46, eh: 50, cx: 38, cy: 56 },
  { ew: 42, eh: 48, cx: 62, cy: 42 },
] as const;

function blendRgb(phase: number): [number, number, number] {
  const span = PALETTE_RGB.length;
  const u = ((phase * 0.4) % span + span) % span;
  const i0 = Math.floor(u) % span;
  const t = u - Math.floor(u);
  const a = PALETTE_RGB[i0]!;
  const b = PALETTE_RGB[(i0 + 1) % span]!;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function bloomLayerGradient(index: number, rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  const L = LAYER_LAYOUT[index] ?? LAYER_LAYOUT[0]!;
  const stops = [
    `rgba(${r},${g},${b},0.56) 0%`,
    `rgba(${r},${g},${b},0.26) 26%`,
    `rgba(${r},${g},${b},0.085) 52%`,
    `rgba(${r},${g},${b},0.026) 74%`,
    `rgba(${r},${g},${b},0.007) 90%`,
    `rgba(${r},${g},${b},0.002) 97%`,
    `transparent 100%`,
  ].join(', ');
  return `radial-gradient(ellipse ${L.ew}% ${L.eh}% at ${L.cx}% ${L.cy}%, ${stops})`;
}

/** Cool void + accent bleed; outer stops hit fully transparent for edge dissolve. */
function atmosphereGradient(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  const ar = Math.round(r * 0.08 + 5 * 0.92);
  const ag = Math.round(g * 0.08 + 1 * 0.92);
  const ab = Math.round(b * 0.08 + 15 * 0.92);
  return [
    'radial-gradient(ellipse 112% 112% at 50% 48%,',
    `rgba(5,1,15,0) 14%,`,
    `rgba(${ar},${ag},${ab},0.14) 38%,`,
    `rgba(5,1,15,0.38) 58%,`,
    `rgba(5,1,15,0.14) 78%,`,
    `rgba(5,1,15,0.035) 92%,`,
    `transparent 100%)`,
  ].join(' ');
}

/** Long feather mask so the whole fog stack vanishes smoothly — no hard oval rim. */
const FOG_OUTER_MASK =
  'radial-gradient(ellipse 100% 100% at 50% 50%, #000 0%, #000 22%, rgba(0,0,0,0.78) 38%, rgba(0,0,0,0.36) 58%, rgba(0,0,0,0.12) 76%, rgba(0,0,0,0.028) 90%, rgba(0,0,0,0.004) 97%, transparent 100%)';

const LAYER_WEIGHTS = [1, 0.92, 0.88, 0.72, 0.65] as const;

function paintFogColors(root: HTMLElement, phase: number): void {
  const layers = root.querySelectorAll<HTMLElement>('[data-bloom-fog-layer]');
  layers.forEach((el, i) => {
    const rgb = blendRgb(phase + i * 1.05);
    el.style.background = bloomLayerGradient(i, rgb);
  });
  const atmo = root.querySelector<HTMLElement>('[data-bloom-fog-atmo]');
  if (atmo) {
    atmo.style.background = atmosphereGradient(blendRgb(phase * 0.62 + 0.75));
  }
}

/**
 * Bloom-like mist over the hero coin: blurred additive halos + thin atmosphere, heavily feathered
 * at the outer mask so it fades fully into the page. Colours drift along the wormhole palette when
 * motion is allowed. Toggled via `wormholeCoinFogEnabled`.
 */
export function WormholeCoinFogOverlay(): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const atmoRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);

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
      const blurPx = 6 + radius * 28;

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

      if (motionPrefs.reduced) {
        paintFogColors(root, 0);
      }
    };

    sync();
    const unsub = tunnelStore.subscribe(sync);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const root = rootRef.current;
      const enabled = tunnelStore.getState().wormholeCoinFogEnabled;

      if (
        enabled &&
        root &&
        root.style.visibility !== 'hidden' &&
        root.style.opacity !== '0' &&
        !motionPrefs.reduced
      ) {
        phaseRef.current += dt * 0.2;
        paintFogColors(root, phaseRef.current);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-[-78%] z-[8] overflow-visible rounded-[50%] opacity-0 [mask-image:var(--bf-outer-mask)] [-webkit-mask-image:var(--bf-outer-mask)] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] [mask-size:100%_100%] [-webkit-mask-size:100%_100%]"
      style={
        {
          visibility: 'hidden',
          '--bf-outer-mask': FOG_OUTER_MASK,
        } as CSSProperties
      }
    >
      <div
        ref={atmoRef}
        data-bloom-fog-atmo
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: atmosphereGradient(PALETTE_RGB[0]!),
          mixBlendMode: 'normal',
          opacity: 0,
        }}
      />
      {LAYER_LAYOUT.map((_, i) => (
        <div
          key={i}
          data-bloom-fog-layer
          className="absolute inset-0 rounded-[50%] will-change-[opacity,filter,background]"
          style={{
            mixBlendMode: 'plus-lighter',
            filter: 'blur(var(--bf-blur, 24px))',
            WebkitFilter: 'blur(var(--bf-blur, 24px))',
            background: bloomLayerGradient(i, PALETTE_RGB[i % PALETTE_RGB.length]!),
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
