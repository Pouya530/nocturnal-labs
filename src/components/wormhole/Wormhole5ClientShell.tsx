'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useLayoutEffect } from 'react';

import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { Wormhole4AtmosphereOverlay } from '@/components/wormhole/Wormhole4AtmosphereOverlay';
import { WormholeJuliaThreeBackdrop } from '@/components/wormhole/WormholeJuliaThreeBackdrop';
import {
  getActiveLandingBackdropMode,
  setActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import {
  WORMHOLE2_HELIX_LAB_POSTFX,
  WORMHOLE4_SENSITIVITY,
  WORMHOLE5_DEBUG_START,
  WORMHOLE5_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/wormhole5` — helix-lab 3D ribbons (as `/wormhole2`) **plus** wormhole4 inverted Julia rings,
 * journey camera, intro mouth rings, atmosphere; **locked** from depth/velocity 0 with no idle drift.
 */
export function Wormhole5ClientShell({ children }: { children: ReactNode }): ReactElement {
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
    const prevDepth = s.depth;
    const prevVelocity = s.velocity;
    const prevScrollVisualMul = s.wormholeScrollVisualMul;
    const prevScrollHelixVelGain = s.wormholeScrollHelixVelGain;
    const prevWormhole3d = s.wormhole3dBackgroundEnabled;
    const prevHelices3d = s.wormholeHelices3dEnabled;
    const prevRandomCamTilt = s.wormholeDebugRandomCamTilt;
    const prevCoinVisible = s.wormholeCoinVisible;
    const prevBlackHoleOverlay = s.wormholeBlackHoleOverlayEnabled;
    const prevCoinFog = s.wormholeCoinFogEnabled;
    const prevBloomStrength = s.bloomStrength;
    const prevBloomRadius = s.bloomRadius;
    const prevBloomThreshold = s.bloomThreshold;
    const prevFogDensity = s.fogDensity;
    const prevSensitivity = s.sensitivity;
    const prevScrollInputIdle = s.scrollInputIdle;

    tunnelStore.setState({
      sensitivity: WORMHOLE4_SENSITIVITY,
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
      depth: WORMHOLE5_TUNNEL_START.depth,
      velocity: WORMHOLE5_TUNNEL_START.velocity,
      scrollInputIdle: 1,
      wormholeScrollVisualMul: -1,
      wormholeScrollHelixVelGain: -0.42,
      ...WORMHOLE5_DEBUG_START,
      /** Same as wormhole2 default — lab Julia tubes on (wormhole4 debug preset had helices off). */
      wormholeHelices3dEnabled: true,
      /** Helix glow/colour read like `/wormhole2` (wormhole4 debug bloom is much weaker). */
      ...WORMHOLE2_HELIX_LAB_POSTFX,
      /** Last so nothing in the spread can override; wormhole5 always boots in locked scroll (not free fly). */
      mode: 'locked',
    });

    /** Beat Strict Mode remount / any same-tick store writes so HUD + scroll integrator stay locked. */
    queueMicrotask(() => tunnelStore.setState({ mode: 'locked' }));

    return () => {
      setActiveLandingBackdropMode(previousMode);
      tunnelStore.setState({
        maxDepth: prevMaxDepth,
        wormholeIdleForward: prevIdle,
        ringCount: prevRingCount,
        ringSpacing: prevRingSpacing,
        mode: prevScrollMode,
        depth: prevDepth,
        velocity: prevVelocity,
        scrollInputIdle: prevScrollInputIdle,
        wormholeScrollVisualMul: prevScrollVisualMul,
        wormholeScrollHelixVelGain: prevScrollHelixVelGain,
        wormhole3dBackgroundEnabled: prevWormhole3d,
        wormholeHelices3dEnabled: prevHelices3d,
        wormholeDebugRandomCamTilt: prevRandomCamTilt,
        wormholeCoinVisible: prevCoinVisible,
        wormholeBlackHoleOverlayEnabled: prevBlackHoleOverlay,
        wormholeCoinFogEnabled: prevCoinFog,
        bloomStrength: prevBloomStrength,
        bloomRadius: prevBloomRadius,
        bloomThreshold: prevBloomThreshold,
        fogDensity: prevFogDensity,
        sensitivity: prevSensitivity,
      });
    };
  }, []);

  useEffect(() => {
    tunnelStore.setState({ mode: 'locked' });
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <WormholeJuliaThreeBackdrop
        helixLab
        ringGrowthInversion
        throatCameraJourney
        introRingsOverlay
      />
      <Wormhole4AtmosphereOverlay />
      <LocalTunnelChrome
        showWormholeControls
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
