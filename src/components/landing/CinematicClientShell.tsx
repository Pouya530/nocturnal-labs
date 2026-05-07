'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { JuliaFractalBackdrop } from '@/components/landing/JuliaFractalBackdrop';
import { JuliaTunnelFractalBackdrop } from '@/components/landing/JuliaTunnelFractalBackdrop';
import { JuliaVortext2FractalBackdrop } from '@/components/landing/JuliaVortext2FractalBackdrop';
import { JuliaVortext3FractalBackdrop } from '@/components/landing/JuliaVortext3FractalBackdrop';
import { JuliaVortexFractalBackdrop } from '@/components/landing/JuliaVortexFractalBackdrop';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { ComingSoonBanner } from '@/components/landing/ComingSoonBanner';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import type { LandingBackdropMode } from '@/lib/landingBackdropMode';
import {
  setActiveLandingBackdropMode,
  persistLandingBackdropMode,
  readStoredLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import { motionPrefs } from '@/core/motion';

/** If set, the portal intro is skipped for the rest of the browser tab session. */
const SESSION_KEY = 'nl-portal-played';
const INTRO_MS = 4800;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CinematicClientShell({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [backdropMode, setBackdropMode] = useState<LandingBackdropMode>('tunnel');
  const introTRef = useRef(0);
  const rafId = useRef(0);
  const introStarted = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const local = isLocalhostHostname(window.location.hostname);
    setIsLocalhost(local);
    if (local) {
      const stored = readStoredLandingBackdropMode();
      if (stored) setBackdropMode(stored);
    }
  }, []);

  const onBackdropModeChange = useCallback((mode: LandingBackdropMode) => {
    setBackdropMode(mode);
    persistLandingBackdropMode(mode);
    setActiveLandingBackdropMode(mode);
  }, []);

  useEffect(() => {
    if (!isLocalhost) {
      setActiveLandingBackdropMode('original');
      return;
    }
    setActiveLandingBackdropMode(backdropMode);
  }, [isLocalhost, backdropMode]);

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
      {!isLocalhost ? (
        <JuliaFractalBackdrop introTRef={introTRef} />
      ) : backdropMode === 'tunnel' ? (
        <JuliaTunnelFractalBackdrop introTRef={introTRef} />
      ) : backdropMode === 'vortex' ? (
        <JuliaVortexFractalBackdrop introTRef={introTRef} />
      ) : backdropMode === 'vortext2' ? (
        <JuliaVortext2FractalBackdrop introTRef={introTRef} />
      ) : backdropMode === 'vortext3' ? (
        <JuliaVortext3FractalBackdrop introTRef={introTRef} />
      ) : backdropMode === 'vortextunnel' ? (
        <JuliaVortexFractalBackdrop introTRef={introTRef} tunnelTravel />
      ) : (
        <JuliaFractalBackdrop introTRef={introTRef} />
      )}
      {process.env.NODE_ENV === 'development' ? (
        <div
          className="pointer-events-none fixed inset-0 z-[1] h-[100dvh] w-screen"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.22) 38%, rgba(0,0,0,0.06) 58%, transparent 74%)',
          }}
          aria-hidden
        />
      ) : null}
      {isLocalhost && (backdropMode === 'tunnel' || backdropMode === 'vortextunnel') ? (
        <LocalTunnelChrome />
      ) : null}
      <LandingTopNav
        backdropToggle={
          isLocalhost ? { mode: backdropMode, onChange: onBackdropModeChange } : undefined
        }
      />
      <div className="relative z-10">{children}</div>
      <ComingSoonBanner />
      <SitePreloader onGone={onPreloaderGone} />
    </div>
  );
}
