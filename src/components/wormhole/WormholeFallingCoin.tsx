'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import {
  resetWormholeFallMotionSnapshot,
  setWormholeFallMotionSnapshot,
} from '@/components/wormhole/wormholeFallMotionBridge';
import { tunnelStore } from '@/tunnel/tunnelStore';

type WormholeFallingCoinProps = {
  children: ReactNode;
};

/** Crossfade into fall when scroll input starts — hand-off from idle spin. */
const FALL_BLEND_EASE_IN_PER_SEC = 2.15;
/** Crossfade out when input idles — gentle return to steady horizontal spin. */
const FALL_BLEND_EASE_OUT_PER_SEC = 4.2;
/** Low-pass on CSS drift (1/s) — softens frame-to-frame steps on Chrome. */
const FALL_DISPLAY_SMOOTH_PER_SEC = 14;

const SCROLL_INPUT_BUSY_IDLE = 0.92;
/** Begin easing fall → spin while `scrollInputIdle` rises (before velocity coast ends). */
const SCROLL_INPUT_RELEASE_START = 0.84;
const SCROLL_INPUT_RELEASE_END = 0.97;
/** Overall drift scale — lower = subtler Y/Z wobble. */
const FALL_DRIFT_AMP_MUL = 0.42;
const FALL_VEL_CARRY_LAMBDA_FAST = 14;
/** Slower carry decay while hands are off — fall amplitude eases with scroll speed memory. */
const FALL_VEL_CARRY_LAMBDA_SLOW = 0.92;
const FALL_VEL_CARRY_REF = 34;

/**
 * “Falling through the tube” while the user is actively scrolling; idles back to steady Y spin in
 * {@link LogoCoin}. Drift phase + amplitude track scroll-speed carry (`|velocity|`).
 */
export function WormholeFallingCoin({ children }: WormholeFallingCoinProps): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const fallBlendSmoothedRef = useRef(0);
  const hasSeenUserScrollRef = useRef(false);
  const activeSinceRef = useRef<number | null>(null);
  const velCarryRef = useRef(0);
  const dispYRef = useRef(0);
  const dispZRef = useRef(0);
  const dispScaleRef = useRef(1);

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
        resetWormholeFallMotionSnapshot();
        raf = requestAnimationFrame(tick);
        return;
      }

      const s = tunnelStore.getState();
      const locked = s.mode === 'locked';
      const vAbs = Math.abs(s.velocity);
      const idleForward = locked && s.wormholeIdleForward > 0 ? s.wormholeIdleForward : 0;
      if (s.scrollInputIdle < 0.96) hasSeenUserScrollRef.current = true;

      const inputBusy = s.scrollInputIdle < SCROLL_INPUT_BUSY_IDLE;
      const movingBeyondIdle = Math.abs(vAbs - idleForward) >= 0.12;
      const scrollPushing =
        hasSeenUserScrollRef.current && (inputBusy || (movingBeyondIdle && s.scrollInputIdle < 0.98));

      const releaseT = Math.min(
        1,
        Math.max(
          0,
          (s.scrollInputIdle - SCROLL_INPUT_RELEASE_START) /
            (SCROLL_INPUT_RELEASE_END - SCROLL_INPUT_RELEASE_START),
        ),
      );
      const releaseAnticipation = releaseT * releaseT * (3 - 2 * releaseT);

      let targetFallBlend = 0;
      if (scrollPushing) {
        if (activeSinceRef.current === null) activeSinceRef.current = now;
        const heldActiveMs = now - activeSinceRef.current;
        const pushIn = heldActiveMs >= 90 ? 1 : 0;
        targetFallBlend = pushIn * (1 - releaseAnticipation);
      } else {
        activeSinceRef.current = null;
      }

      const smooth = fallBlendSmoothedRef.current;
      const goingIntoFall = targetFallBlend > smooth + 0.001;
      const easePerSec = goingIntoFall ? FALL_BLEND_EASE_IN_PER_SEC : FALL_BLEND_EASE_OUT_PER_SEC;
      const easeK = 1 - Math.exp(-easePerSec * dt);
      fallBlendSmoothedRef.current = smooth + (targetFallBlend - smooth) * easeK;
      const w = fallBlendSmoothedRef.current;

      const busy = s.scrollInputIdle < SCROLL_INPUT_BUSY_IDLE;
      const carryLambda = busy ? FALL_VEL_CARRY_LAMBDA_FAST : FALL_VEL_CARRY_LAMBDA_SLOW;
      const carryK = 1 - Math.exp(-carryLambda * dt);
      const velExcess =
        locked && idleForward > 0 ? Math.max(0, vAbs - idleForward) : vAbs;
      velCarryRef.current += (velExcess - velCarryRef.current) * carryK;

      const carryNorm = Math.min(1, Math.max(0, velCarryRef.current / FALL_VEL_CARRY_REF));
      const phaseSpeed = (0.4 + 1.02 * carryNorm) * (0.35 + 0.65 * w);
      phaseRef.current += dt * phaseSpeed;
      const u = phaseRef.current;

      const amp = (0.28 + 0.55 * carryNorm) * w * FALL_DRIFT_AMP_MUL;

      const fallWave = Math.sin(u * 1.05);
      const fallSlow = Math.sin(u * 0.34 + 1.1);
      const targetY = (fallWave * 44 + fallSlow * 26) * amp;
      const targetZ = (Math.cos(u * 0.95 + 0.4) * 48 - 10) * amp;
      const targetScale = 1 + (0.97 + 0.08 * (0.5 + 0.5 * Math.sin(u * 0.92 + 0.65)) - 1) * amp;
      const rotateX = (12 * Math.sin(u * 0.68 + 0.2) + 4.5 * Math.sin(u * 1.75)) * amp;
      const rotateZ = (3.5 * Math.sin(u * 1.42 + 0.7)) * amp;

      setWormholeFallMotionSnapshot({ w, rotateXDeg: rotateX, rotateZDeg: rotateZ });

      const displayK = 1 - Math.exp(-FALL_DISPLAY_SMOOTH_PER_SEC * dt);
      dispYRef.current += (targetY - dispYRef.current) * displayK;
      dispZRef.current += (targetZ - dispZRef.current) * displayK;
      dispScaleRef.current += (targetScale - dispScaleRef.current) * displayK;

      if (w < 0.002) {
        el.style.transform = '';
        dispYRef.current = 0;
        dispZRef.current = 0;
        dispScaleRef.current = 1;
      } else {
        el.style.transform = [
          `translate3d(0, ${dispYRef.current.toFixed(3)}px, ${dispZRef.current.toFixed(3)}px)`,
          `scale(${dispScaleRef.current.toFixed(4)})`,
        ].join(' ');
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      velCarryRef.current = 0;
      dispYRef.current = 0;
      dispZRef.current = 0;
      dispScaleRef.current = 1;
      resetWormholeFallMotionSnapshot();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative origin-center [transform-style:preserve-3d] will-change-transform [-webkit-backface-visibility:visible] [backface-visibility:visible]"
    >
      {children}
    </div>
  );
}
