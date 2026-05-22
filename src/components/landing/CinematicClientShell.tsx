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
import { setActiveLandingBackdropMode, readStoredLandingBackdropMode } from '@/lib/landingBackdropMode';
import { motionPrefs } from '@/core/motion';
import { clearStageReveal, initStageReveal, runStageReveal } from '@/lib/stageReveal';

/** If set, the portal intro is skipped for the rest of the browser tab session. */
const SESSION_KEY = 'nl-portal-played';

export function CinematicClientShell({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [backdropMode, setBackdropMode] = useState<LandingBackdropMode>('tunnel');
  const introTRef = useRef(0);
  const introStarted = useRef(false);
  const stageRevealCancel = useRef({ cancel: () => {} });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const local = isLocalhostHostname(window.location.hostname);
    setIsLocalhost(local);
    if (local) {
      const stored = readStoredLandingBackdropMode();
      if (stored) setBackdropMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!isLocalhost) {
      setActiveLandingBackdropMode('original');
      return;
    }
    setActiveLandingBackdropMode(backdropMode);
  }, [isLocalhost, backdropMode]);

  useLayoutEffect(() => {
    introStarted.current = false;
    if (typeof document === 'undefined') return;
    if (reduced) {
      introTRef.current = 1;
      document.documentElement.style.setProperty('--nl-intro', '1');
      initStageReveal();
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
        document.documentElement.style.setProperty('--stage-reveal-progress', '1');
        document.documentElement.style.setProperty('--stage-reveal-scale', '1');
        document.documentElement.style.setProperty('--stage-reveal-opacity', '1');
        return;
      }
    } catch {
      /* */
    }
    introTRef.current = 0;
    document.documentElement.style.setProperty('--nl-intro', '0');
    initStageReveal();
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
    stageRevealCancel.current.cancel();
    stageRevealCancel.current = runStageReveal({
      onFrame(_linear, eased) {
        introTRef.current = eased;
        document.documentElement.style.setProperty('--nl-intro', String(eased));
      },
      onComplete() {
        introTRef.current = 1;
        document.documentElement.style.setProperty('--nl-intro', '1');
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          /* */
        }
      },
    });
  }, [reduced]);

  useEffect(() => {
    return () => {
      stageRevealCancel.current.cancel();
      clearStageReveal();
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
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
      <ComingSoonBanner />
      <SitePreloader onGone={onPreloaderGone} />
    </div>
  );
}
