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
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

function desktopFreeFlyDefault(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(min-width: 768px)').matches && window.matchMedia('(pointer: fine)').matches
  );
}

/**
 * `/wormhole2` — **Three.js** tunnel (Julia on helix tubes, dark void, particles) + same scroll/HUD
 * as `/wormhole`. No 2D Julia vortex; 3D layer obeys `wormhole3dBackgroundEnabled`.
 */
export function Wormhole2ClientShell({ children }: { children: ReactNode }): ReactElement {
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--nl-intro', '1');

    const previousMode = getActiveLandingBackdropMode();
    setActiveLandingBackdropMode('original');

    const s = tunnelStore.getState();
    const prevMaxDepth = s.maxDepth;
    const prevIdle = s.wormholeIdleForward;
    const prevScrollMode: ScrollMode = s.mode;
    const startFree = desktopFreeFlyDefault();

    tunnelStore.setState({
      maxDepth: 12_000,
      wormholeIdleForward: 0.55,
      ...(startFree ? { mode: 'free' as const } : {}),
    });

    return () => {
      setActiveLandingBackdropMode(previousMode);
      tunnelStore.setState({
        maxDepth: prevMaxDepth,
        wormholeIdleForward: prevIdle,
        mode: prevScrollMode,
      });
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <WormholeJuliaThreeBackdrop helixLab />
      <LocalTunnelChrome showWormholeControls />
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
