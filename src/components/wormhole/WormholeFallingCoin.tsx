'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { WormholeCoinFogOverlay } from '@/components/wormhole/WormholeCoinFogOverlay';
import { motionPrefs } from '@/core/motion';
import { tunnelStore } from '@/tunnel/tunnelStore';

type WormholeFallingCoinProps = {
  children: ReactNode;
};

/** First-order lag toward fall on / off — lower = slower crossfade from spin to drift (and back). */
const FALL_BLEND_EASE_PER_SEC = 10;

/**
 * “Falling through the tube” CSS motion after scroll has fully settled — **locked and free fly**.
 * Gates: user has scrolled once, input idle, and velocity near the steady baseline (0 in free fly,
 * `wormholeIdleForward` in locked when that drift is enabled).
 */
export function WormholeFallingCoin({ children }: WormholeFallingCoinProps): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  /** Smoothed 0–1 fall weight (avoids chatter at the velocity threshold). */
  const fallBlendSmoothedRef = useRef(0);
  /** Arms fall only after the user has actually scrolled once. */
  const hasSeenUserScrollRef = useRef(false);
  /** Time (ms) when motion first entered a settled state. */
  const settledSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) * 0.001, 0.05);
      last = now;

      if (motionPrefs.reduced) {
        el.style.transform = '';
        raf = requestAnimationFrame(tick);
        return;
      }

      const s = tunnelStore.getState();
      const locked = s.mode === 'locked';
      const vAbs = Math.abs(s.velocity);
      const idleForward = locked && s.wormholeIdleForward > 0 ? s.wormholeIdleForward : 0;
      if (s.scrollInputIdle < 0.96) hasSeenUserScrollRef.current = true;
      const settledVel = Math.abs(vAbs - idleForward) < 0.12;
      const inputIdle = s.scrollInputIdle > 0.995;
      const canSettle = hasSeenUserScrollRef.current && inputIdle && settledVel;
      if (!canSettle) settledSinceRef.current = null;
      else if (settledSinceRef.current === null) settledSinceRef.current = now;
      const heldSettledMs = settledSinceRef.current === null ? 0 : now - settledSinceRef.current;
      const targetFallBlend = canSettle && heldSettledMs >= 220 ? 1 : 0;

      const smooth = fallBlendSmoothedRef.current;
      const easeK = 1 - Math.exp(-FALL_BLEND_EASE_PER_SEC * dt);
      fallBlendSmoothedRef.current = smooth + (targetFallBlend - smooth) * easeK;
      const w = fallBlendSmoothedRef.current;

      const speed = 1 + vAbs * 95;
      phaseRef.current += dt * (0.85 + speed * 0.35) * (0.35 + 0.65 * w);
      const u = phaseRef.current;

      const fallWave = Math.sin(u * 1.15);
      const fallSlow = Math.sin(u * 0.38 + 1.1);
      const translateY = (fallWave * 38 + fallSlow * 22) * w;
      const translateZ = (Math.cos(u * 1.05 + 0.4) * 55 - 12) * w;
      const scale = 1 + (0.9 + 0.14 * (0.5 + 0.5 * Math.sin(u * 1.02 + 0.65)) - 1) * w;
      const rotateX = (16 * Math.sin(u * 0.72 + 0.2) + 6 * Math.sin(u * 1.9)) * w;
      const rotateZ = (4.5 * Math.sin(u * 1.55 + 0.7)) * w;

      if (w < 0.002) {
        el.style.transform = '';
      } else {
        el.style.transform = [
          `translate3d(0, ${translateY.toFixed(3)}px, ${translateZ.toFixed(3)}px)`,
          `rotateX(${rotateX.toFixed(3)}deg)`,
          `rotateZ(${rotateZ.toFixed(3)}deg)`,
          `scale(${scale.toFixed(4)})`,
        ].join(' ');
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative origin-center [transform-style:preserve-3d] will-change-transform [-webkit-backface-visibility:visible] [backface-visibility:visible]"
    >
      {children}
      <WormholeCoinFogOverlay />
    </div>
  );
}
