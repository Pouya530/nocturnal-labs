'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

import { JuliaFractalBackdrop } from '@/components/landing/JuliaFractalBackdrop';
import { ComingSoonBanner } from '@/components/landing/ComingSoonBanner';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { motionPrefs } from '@/core/motion';

/** If set, the portal intro is skipped for the rest of the browser tab session. */
const SESSION_KEY = 'nl-portal-played';
const INTRO_MS = 4800;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CinematicClientShell({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const introTRef = useRef(0);
  const rafId = useRef(0);
  const introStarted = useRef(false);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (reduced) {
      introTRef.current = 1;
      document.documentElement.style.setProperty('--nl-intro', '1');
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* private mode or quota */
      }
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        introTRef.current = 1;
        document.documentElement.style.setProperty('--nl-intro', '1');
        return;
      }
    } catch {
      /* */
    }
    introTRef.current = 0;
    document.documentElement.style.setProperty('--nl-intro', '0');
  }, [reduced]);

  const onPreloaderGone = useCallback(() => {
    if (reduced) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      /* */
    }
    if (introStarted.current) return;
    introStarted.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / INTRO_MS);
      const e = easeInOutCubic(u);
      introTRef.current = e;
      if (document.documentElement) {
        document.documentElement.style.setProperty('--nl-intro', String(e));
      }
      if (u < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        introTRef.current = 1;
        document.documentElement.style.setProperty('--nl-intro', '1');
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          /* */
        }
      }
    };
    rafId.current = requestAnimationFrame(step);
  }, [reduced]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full">
      <JuliaFractalBackdrop introTRef={introTRef} />
      <div
        className="site-bg-radial-opacity pointer-events-none fixed inset-0 z-[1] min-h-[100dvh] min-h-[100lvh] h-full w-full"
        aria-hidden
      />
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
      <ComingSoonBanner />
      <SitePreloader onGone={onPreloaderGone} />
    </div>
  );
}
