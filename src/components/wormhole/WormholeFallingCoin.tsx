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

/**
 * Crossfade **into** fall (`w` → 1 after scroll settles) — lower = slower, smoother hand-off from
 * spin / tunnel motion to the drift. Bob speed stays full once `w` reaches 1.
 */
const FALL_BLEND_EASE_IN_PER_SEC = 3.1;
/** Crossfade **out** of fall when the user scrolls again — a bit quicker so input feels responsive. */
const FALL_BLEND_EASE_OUT_PER_SEC = 11;

/** `|velocity|` above this counts as “hands on” for fast carry tracking. */
const SCROLL_INPUT_BUSY_IDLE = 0.92;
/** Easing toward live `|v|` while the user is actively scrolling (1/s). */
const FALL_VEL_CARRY_LAMBDA_FAST = 14;
/** Easing / decay when hands-off — fall motion coasts from remembered speed (1/s). */
const FALL_VEL_CARRY_LAMBDA_SLOW = 1.25;
/** Maps carry to normalized drive `0–1` (tune to tunnel velocity scale). */
const FALL_VEL_CARRY_REF = 34;

/**
 * “Falling through the tube” after scroll settles — **locked and free fly**.
 * Drift phase + amplitude track a smoothed **scroll-speed carry** (`|velocity|`) so a hard scroll
 * leaves a stronger coast than a nudge (not a fixed idle wobble).
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
  /** Smoothed scroll speed (depth units / tick scale) — drives fall phase + amplitude vs free-running drift. */
  const velCarryRef = useRef(0);

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
      const settledVel = Math.abs(vAbs - idleForward) < 0.12;
      const inputIdle = s.scrollInputIdle > 0.995;
      const canSettle = hasSeenUserScrollRef.current && inputIdle && settledVel;
      if (!canSettle) settledSinceRef.current = null;
      else if (settledSinceRef.current === null) settledSinceRef.current = now;
      const heldSettledMs = settledSinceRef.current === null ? 0 : now - settledSinceRef.current;
      const targetFallBlend = canSettle && heldSettledMs >= 220 ? 1 : 0;

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
      /** Phase speed scales with remembered scroll intensity (not a fixed idle rhythm). */
      const phaseSpeed = (0.46 + 1.12 * carryNorm) * (0.35 + 0.65 * w);
      phaseRef.current += dt * phaseSpeed;
      const u = phaseRef.current;

      const amp = (0.33 + 0.78 * carryNorm) * w;

      const fallWave = Math.sin(u * 1.15);
      const fallSlow = Math.sin(u * 0.38 + 1.1);
      const translateY = (fallWave * 44 + fallSlow * 26) * amp;
      const translateZ = (Math.cos(u * 1.05 + 0.4) * 63 - 14) * amp;
      const scale = 1 + (0.94 + 0.16 * (0.5 + 0.5 * Math.sin(u * 1.02 + 0.65)) - 1) * amp;
      const rotateX = (18 * Math.sin(u * 0.72 + 0.2) + 6.8 * Math.sin(u * 1.9)) * amp;
      const rotateZ = (5.2 * Math.sin(u * 1.55 + 0.7)) * amp;

      setWormholeFallMotionSnapshot({ w, rotateXDeg: rotateX, rotateZDeg: rotateZ });

      if (w < 0.002) {
        el.style.transform = '';
      } else {
        /** Tilt is applied in GL (`LogoCoin` fall wobble group); CSS keeps float + scale only. */
        el.style.transform = [
          `translate3d(0, ${translateY.toFixed(3)}px, ${translateZ.toFixed(3)}px)`,
          `scale(${scale.toFixed(4)})`,
        ].join(' ');
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      velCarryRef.current = 0;
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
