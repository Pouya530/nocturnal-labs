'use client';

import { useLayoutEffect, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import { dmSans } from '@/lib/fonts';
import { motionPrefs } from '@/core/motion';

/** Minimum time before exit can start (0 = dismiss as soon as `window` load fires). */
const MIN_MS = 0;
/** Overlay fade duration once dismissal begins. */
const FADE_MS = 900;

const FADE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

type Phase = 'visible' | 'hiding' | 'gone';

export type SitePreloaderProps = {
  /** Fires once when dismissal begins (fade starts); chained intros run in parallel with the veil. */
  onGone?: () => void;
};

/**
 * Full-viewport preloader: waits for window load, then eases the black veil away.
 * Respects reduced motion (instant hide).
 */
export function SitePreloader({ onGone }: SitePreloaderProps = {}): ReactElement | null {
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const [phase, setPhase] = useState<Phase>('visible');
  const [progress, setProgress] = useState(0);
  const loadDone = useRef(false);
  const minDone = useRef(false);
  const canFinish = useRef(false);
  const progressRef = useRef(0);

  useLayoutEffect(() => {
    if (reduced) {
      setPhase('gone');
    }
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;

    const tryExit = () => {
      if (!loadDone.current || !minDone.current) return;
      if (canFinish.current) return;
      canFinish.current = true;
      progressRef.current = 100;
      setProgress(100);
      setPhase('hiding');
    };

    const onLoad = () => {
      loadDone.current = true;
      tryExit();
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    const t = window.setTimeout(() => {
      minDone.current = true;
      tryExit();
    }, MIN_MS);

    const tick = window.setInterval(() => {
      const current = progressRef.current;
      if (current >= 100) return;
      const step = canFinish.current ? 4 : current < 70 ? 2 : 1;
      const cap = canFinish.current ? 100 : 95;
      const next = Math.min(cap, current + step);
      progressRef.current = next;
      setProgress(next);
    }, 36);

    return () => {
      window.clearTimeout(t);
      window.clearInterval(tick);
      window.removeEventListener('load', onLoad);
    };
  }, [reduced]);

  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  /** Notify consumers once dismiss begins (`hiding`) or immediately when reduced motion skips the fade. */
  const dismissNotified = useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (phase === 'gone') {
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (document.body) document.body.style.overflow = '';
    };
  }, [phase]);

  useEffect(() => {
    if (dismissNotified.current) return;
    const notify = phase === 'hiding' || (reduced && phase === 'gone');
    if (!notify) return;
    dismissNotified.current = true;
    onGoneRef.current?.();
  }, [phase, reduced]);

  if (phase === 'gone') return null;

  const transitionStyle = reduced
    ? undefined
    : { transitionDuration: `${FADE_MS}ms`, transitionTimingFunction: FADE_EASE };

  return (
    <div
      className={[
        'site-preloader fixed inset-0 z-[100] flex flex-col items-center justify-center',
        'bg-[#020204] motion-reduce:transition-none',
        phase === 'hiding' ? 'pointer-events-none opacity-0' : 'opacity-100',
        dmSans.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...transitionStyle,
        transitionProperty: reduced ? undefined : 'opacity',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      onTransitionEnd={(e) => {
        if (e.propertyName !== 'opacity' || phase !== 'hiding') return;
        setPhase('gone');
      }}
    >
      <div className="relative flex h-32 w-32 items-center justify-center" aria-hidden>
        <div className="site-preloader-ambient pointer-events-none absolute inset-[-18%] rounded-full opacity-90" />
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-white/[0.07] motion-reduce:animate-none"
          style={reduced ? undefined : { animation: 'site-preloader-drift 14s linear infinite' }}
        />
        <div
          className="absolute inset-[10%] rounded-full border border-transparent border-t-violet-400/75 border-r-fuchsia-500/35 motion-reduce:animate-none"
          style={reduced ? undefined : { animation: 'site-preloader-spin 1.05s linear infinite' }}
        />
        <div className="text-[11px] font-semibold tabular-nums tracking-[0.08em] text-violet-200/90">
          {String(progress).padStart(3, '0')}%
        </div>
      </div>
      <p
        className="mt-8 text-center text-[11px] font-medium uppercase leading-snug tracking-[0.28em] text-zinc-500/90"
        aria-hidden
      >
        Nocturnal Labs
      </p>
    </div>
  );
}
