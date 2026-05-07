'use client';

import { useEffect, useRef } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';

const DEFAULT_MAX_DEPTH = 256;
const TOUCH_MULTIPLIER = 2.5;
const KEY_DELTA = 5;

/** Wheel impulse decays with ~this e-folding time (seconds) so motion lingers ~1+ minute. */
const SCROLL_COAST_TAU_SEC = 72;
/**
 * When there is no wheel/touch impulse this frame, velocity is pulled toward 0 with this rate (1/s)
 * on top of coast + friction so motion **eventually stops** (free fly and locked).
 */
const VEL_SETTLE_PER_SEC = 2.15;
/** Snap velocity to 0 below this to avoid endless float noise. */
const VEL_SNAP_EPS = 0.004;
/**
 * Locked + `wormholeIdleForward`: only resume cruise drift after `scrollInputIdle` reaches this
 * (user hands-off), so scroll-induced speed still decays to a true standstill first.
 */
const LOCKED_CRUISE_AFTER_SCROLL_IDLE = 0.92;
/** After input stops, `scrollInputIdle` eases toward 1 with ~this time constant (seconds). */
const SCROLL_INPUT_IDLE_TAU_SEC = 0.2;
const LOCKED_VEL_MAX = 140;
const FREE_VEL_MAX = 45;
/** Locked mode: base wheel impulse vs free (`sensitivity` is still applied). */
const LOCKED_IMPULSE_BASE = 0.38;
/** Larger single-frame wheel chunks get extra multipliers (“additional speeds”). */
const LOCKED_IMPULSE_FAST_ABS = 40;
const LOCKED_IMPULSE_FAST_MUL = 1.42;
const LOCKED_IMPULSE_VFAST_ABS = 72;
const LOCKED_IMPULSE_VFAST_MUL = 1.88;

function normalizeWheel(e: WheelEvent): number {
  if (e.ctrlKey) return 0;
  let pY = e.deltaY;
  if (e.deltaMode === 1) pY *= 40;
  else if (e.deltaMode === 2) pY *= 800;
  return Math.max(-100, Math.min(100, pY));
}

export type ScrollDepthOptions = {
  /**
   * Multiply wheel / touch / key impulses before integrating (`+1` default).
   * `-1` inverts scroll (e.g. `/wormhole3`).
   */
  impulseSign?: number;
};

/**
 * Maps wheel / touch / keys → `tunnelStore.depth` + `velocity`.
 * **Locked:** stronger wheel impulse + higher `|velocity|` cap; same coast × friction ×
 * {@link VEL_SETTLE_PER_SEC} when input stops so motion **settles like free fly**. Optional
 * `wormholeIdleForward` cruise resumes only after `scrollInputIdle` crosses
 * {@link LOCKED_CRUISE_AFTER_SCROLL_IDLE}.
 * **Free fly:** touch-pan, lower cap; same friction + settle when input stops.
 */
export function useScrollDepth(enabled: boolean, options?: ScrollDepthOptions) {
  const impulseSign = options?.impulseSign ?? 1;
  const wheelAccumRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef(performance.now());
  const currentDepthRef = useRef(0);
  const currentVelocityRef = useRef(0);
  const scrollInputIdleRef = useRef(1);
  const keyScrollNudgeRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const syncFromStore = () => {
      const s = tunnelStore.getState();
      currentDepthRef.current = s.depth;
      currentVelocityRef.current = s.velocity;
      scrollInputIdleRef.current = s.scrollInputIdle;
    };
    syncFromStore();
    const unsub = tunnelStore.subscribe(syncFromStore);

    const applyScrollLockedClass = () => {
      const m = tunnelStore.getState().mode;
      const tunnelScroll = m === 'locked' || m === 'free';
      document.documentElement.classList.toggle('scroll-locked', tunnelScroll);
      if (tunnelScroll) {
        document.documentElement.dataset.scrollMode = m;
      } else {
        document.documentElement.removeAttribute('data-scroll-mode');
      }
    };
    applyScrollLockedClass();
    const unsubMode = tunnelStore.subscribe(applyScrollLockedClass);

    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-no-wheel]')) return;
      e.preventDefault();
      wheelAccumRef.current += normalizeWheel(e) * impulseSign;
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    const onTouchStart = (e: TouchEvent) => {
      lastTouchYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (tunnelStore.getState().mode !== 'free') return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      wheelAccumRef.current += (lastTouchYRef.current - y) * TOUCH_MULTIPLIER * impulseSign;
      lastTouchYRef.current = y;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = tunnelStore.getState();
      switch (e.key) {
        case 'l':
        case 'L':
          tunnelStore.setState({ mode: s.mode === 'locked' ? 'free' : 'locked' });
          break;
        case 'ArrowDown':
        case 'PageDown':
          if (s.mode === 'free') wheelAccumRef.current += KEY_DELTA * 20 * impulseSign;
          else {
            currentVelocityRef.current += KEY_DELTA * 1.75 * impulseSign;
            keyScrollNudgeRef.current = true;
          }
          break;
        case 'ArrowUp':
        case 'PageUp':
          if (s.mode === 'free') wheelAccumRef.current -= KEY_DELTA * 20 * impulseSign;
          else {
            currentVelocityRef.current -= KEY_DELTA * 1.75 * impulseSign;
            keyScrollNudgeRef.current = true;
          }
          break;
        case 'Home':
          scrollInputIdleRef.current = 1;
          tunnelStore.setState({ depth: 0, velocity: 0, scrollInputIdle: 1 });
          break;
        case 'End': {
          const cap = tunnelStore.getState().maxDepth ?? DEFAULT_MAX_DEPTH;
          scrollInputIdleRef.current = 1;
          tunnelStore.setState({ depth: cap, velocity: 0, scrollInputIdle: 1 });
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);

    const tick = (t: number) => {
      const raw = (t - lastTRef.current) / 1000;
      const dt = Math.min(Math.max(raw, 1 / 240), 0.05);
      lastTRef.current = t;

      const s = tunnelStore.getState();
      const maxDepth = Math.max(1, s.maxDepth ?? DEFAULT_MAX_DEPTH);
      const coast = Math.exp(-dt / SCROLL_COAST_TAU_SEC);

      const advanceScrollInputIdle = (hadInput: boolean) => {
        let idle = scrollInputIdleRef.current;
        if (hadInput || keyScrollNudgeRef.current) idle = 0;
        else idle += (1 - idle) * (1 - Math.exp(-dt / SCROLL_INPUT_IDLE_TAU_SEC));
        keyScrollNudgeRef.current = false;
        scrollInputIdleRef.current = idle;
        return idle;
      };

      if (s.mode === 'free') {
        const rawFree = wheelAccumRef.current;
        const impulse = rawFree * s.sensitivity;
        wheelAccumRef.current = 0;
        const hadInput = Math.abs(rawFree) > 1e-9 || keyScrollNudgeRef.current;
        let v = currentVelocityRef.current + impulse;
        v = Math.max(-FREE_VEL_MAX, Math.min(FREE_VEL_MAX, v));
        let d = currentDepthRef.current + v * dt;
        d = Math.max(0, Math.min(maxDepth, d));
        if (d <= 0 && v < 0) v = 0;
        if (d >= maxDepth && v > 0) v = 0;
        v *= coast * Math.pow(s.friction, dt * 8);
        if (!hadInput) {
          v *= Math.exp(-dt * VEL_SETTLE_PER_SEC);
        }
        if (Math.abs(v) < VEL_SNAP_EPS) v = 0;
        currentDepthRef.current = d;
        currentVelocityRef.current = v;
        const scrollInputIdle = advanceScrollInputIdle(hadInput);
        tunnelStore.setState({ depth: d, velocity: v, scrollInputIdle });
      } else {
        const rawWheel = wheelAccumRef.current;
        wheelAccumRef.current = 0;
        const hadInput = Math.abs(rawWheel) > 1e-9 || keyScrollNudgeRef.current;
        const chunk = Math.abs(rawWheel);
        let impulseMul = LOCKED_IMPULSE_BASE;
        if (chunk >= LOCKED_IMPULSE_VFAST_ABS) impulseMul *= LOCKED_IMPULSE_VFAST_MUL;
        else if (chunk >= LOCKED_IMPULSE_FAST_ABS) impulseMul *= LOCKED_IMPULSE_FAST_MUL;
        const impulse = rawWheel * s.sensitivity * impulseMul;
        let v = currentVelocityRef.current + impulse;
        v = Math.max(-LOCKED_VEL_MAX, Math.min(LOCKED_VEL_MAX, v));
        let d = currentDepthRef.current + v * dt;
        d = Math.max(0, Math.min(maxDepth, d));
        if (d <= 0 && v < 0) v = 0;
        if (d >= maxDepth && v > 0) v = 0;
        v *= coast * Math.pow(s.friction, dt * 8);
        if (!hadInput) {
          v *= Math.exp(-dt * VEL_SETTLE_PER_SEC);
        }
        if (Math.abs(v) < VEL_SNAP_EPS) v = 0;
        const scrollInputIdle = advanceScrollInputIdle(hadInput);
        if (
          s.wormholeIdleForward > 0 &&
          Math.abs(v) < 0.08 &&
          !hadInput &&
          scrollInputIdle >= LOCKED_CRUISE_AFTER_SCROLL_IDLE
        ) {
          v = s.wormholeIdleForward;
        }
        currentDepthRef.current = d;
        currentVelocityRef.current = v;
        tunnelStore.setState({ depth: d, velocity: v, scrollInputIdle });
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (rafRef.current === null) {
        lastTRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      unsub();
      unsubMode();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.documentElement.classList.remove('scroll-locked');
      document.documentElement.removeAttribute('data-scroll-mode');
    };
  }, [enabled, impulseSign]);
}
