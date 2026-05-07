'use client';

import type { ReactNode, ReactElement } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import { WORMHOLE_COIN_DEPTH_SLOT_MUL } from '@/lib/wormholePageConfig';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/wormhole` only: scales the hero coin with scroll depth — **50% size at `depth === maxDepth`**,
 * full size at `depth === 0`. Uses √(depth/maxDepth) so shrink is visible long before the end
 * (linear depth alone would need ~thousands of units before a noticeable change with maxDepth 12k).
 */
export function WormholeCoinDepthScale({ children }: { children: ReactNode }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let smooth = 1;

    const tick = (now: number) => {
      const dt = Math.min((now - last) * 0.001, 0.05);
      last = now;

      if (motionPrefs.reduced) {
        el.style.transform = '';
        raf = requestAnimationFrame(tick);
        return;
      }

      const s = tunnelStore.getState();
      const max = Math.max(1, s.maxDepth);
      const linearNorm = Math.min(1, Math.max(0, s.depth / max));
      const eased = Math.sqrt(linearNorm);
      const target = 1 - 0.5 * eased;
      smooth += (target - smooth) * (1 - Math.exp(-24 * dt));

      el.style.transform = `scale(${smooth})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };
  }, []);

  const slot = `calc(var(--hero-logo-size, 200px) * ${WORMHOLE_COIN_DEPTH_SLOT_MUL})`;

  return (
    <div className="flex w-full shrink-0 justify-center overflow-visible">
      <div
        ref={ref}
        className="inline-flex shrink-0 origin-center items-center justify-center overflow-visible will-change-transform [transform-style:preserve-3d]"
        style={{ width: slot, height: slot }}
      >
        {children}
      </div>
    </div>
  );
}
