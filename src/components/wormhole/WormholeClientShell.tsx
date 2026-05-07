'use client';

import type { ReactNode, ReactElement } from 'react';
import { useLayoutEffect } from 'react';

import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { WormholeJuliaThreeBackdrop } from '@/components/wormhole/WormholeJuliaThreeBackdrop';
import {
  getActiveLandingBackdropMode,
  setActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import { WORMHOLE_CLASSIC_TUNNEL } from '@/lib/wormholePageConfig';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

function desktopFreeFlyDefault(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(min-width: 768px)').matches && window.matchMedia('(pointer: fine)').matches
  );
}

/**
 * `/wormhole` lab shell: **Three.js Julia wormhole** + same scroll/HUD as tunnel
 * (`useScrollDepth` → `tunnelStore.depth` / `velocity`).
 */
export function WormholeClientShell({ children }: { children: ReactNode }): ReactElement {
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--nl-intro', '1');

    const previousMode = getActiveLandingBackdropMode();
    setActiveLandingBackdropMode('original');

    const s = tunnelStore.getState();
    const prevMaxDepth = s.maxDepth;
    const prevIdle = s.wormholeIdleForward;
    const prevRingCount = s.ringCount;
    const prevRingSpacing = s.ringSpacing;
    const prevScrollMode: ScrollMode = s.mode;
    const startFree = desktopFreeFlyDefault();

    tunnelStore.setState({
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0.55,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
      ...(startFree ? { mode: 'free' as const } : {}),
    });

    return () => {
      setActiveLandingBackdropMode(previousMode);
      tunnelStore.setState({
        maxDepth: prevMaxDepth,
        wormholeIdleForward: prevIdle,
        ringCount: prevRingCount,
        ringSpacing: prevRingSpacing,
        mode: prevScrollMode,
      });
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full">
      <WormholeJuliaThreeBackdrop />
      <LocalTunnelChrome showWormholeControls />
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
