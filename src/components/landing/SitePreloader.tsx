'use client';

import { useLayoutEffect, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import { dmSans } from '@/lib/fonts';
import { motionPrefs } from '@/core/motion';

const MIN_MS = 520;
const FADE_MS = 520;

type Phase = 'visible' | 'hiding' | 'gone';

export type SitePreloaderProps = {
  /** Fires once when the overlay is fully removed (phase `gone`); for chaining e.g. portal intro. */
  onGone?: () => void;
};

/**
 * Full-viewport preloader: waits for window load, enforces a short minimum so the
 * mark does not vanish in a single frame, then cross-fades out. Respects reduced motion.
 */
export function SitePreloader({ onGone }: SitePreloaderProps = {}): ReactElement | null {
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const [phase, setPhase] = useState<Phase>('visible');
  const loadDone = useRef(false);
  const minDone = useRef(false);

  useLayoutEffect(() => {
    if (reduced) {
      setPhase('gone');
    }
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;

    const tryExit = () => {
      if (!loadDone.current || !minDone.current) return;
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

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('load', onLoad);
    };
  }, [reduced]);

  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  const goneNotified = useRef(false);

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
    if (phase !== 'gone' || goneNotified.current) return;
    goneNotified.current = true;
    onGoneRef.current?.();
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={[
        'site-preloader fixed inset-0 z-[100] flex flex-col items-center justify-center',
        'bg-[#020204] transition-opacity ease-out motion-reduce:transition-none',
        phase === 'hiding' ? 'pointer-events-none opacity-0' : 'opacity-100',
        dmSans.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={reduced ? undefined : { transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      onTransitionEnd={(e) => {
        if (e.propertyName !== 'opacity' || phase !== 'hiding') return;
        setPhase('gone');
      }}
    >
      <div
        className="site-preloader-orbit h-12 w-12 animate-spin rounded-full border-2 border-violet-500/25 border-t-violet-400/90 motion-reduce:animate-none"
        style={reduced ? undefined : { animationDuration: '0.85s' }}
        aria-hidden
      />
      <p
        className="mt-5 text-center text-xs font-medium uppercase leading-snug tracking-[0.2em] text-zinc-500"
        aria-hidden
      >
        Nocturnal Labs
      </p>
    </div>
  );
}
