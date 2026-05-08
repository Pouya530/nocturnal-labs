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
import { WORMHOLE3_TUNNEL } from '@/lib/wormholePageConfig';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

import { Wormhole3CoinReveal } from '@/components/wormhole/Wormhole3CoinReveal';

/**
 * `/wormhole3` — same Three.js materials as `/wormhole`, with inverted scroll, throat ring layout,
 * and tunable ring count / spacing from {@link WORMHOLE3_TUNNEL}.
 */
export function Wormhole3ClientShell({ children }: { children: ReactNode }): ReactElement {
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
    const prevCoinVisible = s.wormholeCoinVisible;
    const prevCoinClickTunnelBoost = s.wormholeCoinClickTunnelBoost;

    tunnelStore.setState({
      maxDepth: WORMHOLE3_TUNNEL.maxDepth,
      wormholeIdleForward: 0.55,
      ringCount: WORMHOLE3_TUNNEL.ringCount,
      ringSpacing: WORMHOLE3_TUNNEL.ringSpacing,
      mode: 'free',
      wormholeCoinVisible: false,
    });

    return () => {
      setActiveLandingBackdropMode(previousMode);
      tunnelStore.setState({
        maxDepth: prevMaxDepth,
        wormholeIdleForward: prevIdle,
        ringCount: prevRingCount,
        ringSpacing: prevRingSpacing,
        mode: prevScrollMode,
        wormholeCoinVisible: prevCoinVisible,
        wormholeCoinClickTunnelBoost: prevCoinClickTunnelBoost,
      });
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full">
      <WormholeJuliaThreeBackdrop tunnelMode="throat" />
      <LocalTunnelChrome
        showWormholeControls
        scrollOptions={{ impulseSign: WORMHOLE3_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <Wormhole3CoinReveal />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
