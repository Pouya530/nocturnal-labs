'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useLayoutEffect } from 'react';

import { CosmicBackdrop } from '@/components/cosmic/CosmicBackdrop';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { Wormhole4AtmosphereOverlayGate } from '@/components/wormhole/Wormhole4AtmosphereOverlayGate';
import { WormholeJuliaThreeBackdrop } from '@/components/wormhole/WormholeJuliaThreeBackdrop';
import {
  getActiveLandingBackdropMode,
  setActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import {
  WORMHOLE2_HELIX_LAB_POSTFX,
  WORMHOLE4_SENSITIVITY,
  WORMHOLE5_DEBUG_START,
  WORMHOLE10_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/wormhole10` — same **Three.js stack as `/wormhole5`** (`helixLab`, inversion rings, journey, mouth rings)
 * with {@link CosmicBackdrop} fixed **behind** the Julia layer (`z-0` vs `z-[1]`). Does not alter wormhole5.
 */
export function Wormhole10ClientShell({ children }: { children: ReactNode }): ReactElement {
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
    const prevCircularCamTilt = s.wormholeDebugCircularCamTilt;
    const prevCoinVisible = s.wormholeCoinVisible;
    const prevCoinClickTunnelBoost = s.wormholeCoinClickTunnelBoost;
    const prevBlackHoleOverlay = s.wormholeBlackHoleOverlayEnabled;
    const prevAtmosphereOverlay = s.wormholeAtmosphereOverlayEnabled;
    const prevHelixJuliaRibbonShader = s.wormholeHelixJuliaRibbonShaderEnabled;
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
      depth: WORMHOLE10_TUNNEL_START.depth,
      velocity: WORMHOLE10_TUNNEL_START.velocity,
      scrollInputIdle: 1,
      wormholeScrollVisualMul: -1,
      wormholeScrollHelixVelGain: -0.42,
      ...WORMHOLE5_DEBUG_START,
      wormholeHelices3dEnabled: true,
      ...WORMHOLE2_HELIX_LAB_POSTFX,
      mode: 'locked',
    });

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
        wormholeDebugCircularCamTilt: prevCircularCamTilt,
        wormholeCoinVisible: prevCoinVisible,
        wormholeCoinClickTunnelBoost: prevCoinClickTunnelBoost,
        wormholeBlackHoleOverlayEnabled: prevBlackHoleOverlay,
        wormholeAtmosphereOverlayEnabled: prevAtmosphereOverlay,
        wormholeHelixJuliaRibbonShaderEnabled: prevHelixJuliaRibbonShader,
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
      <p
        className="pointer-events-none fixed left-1/2 top-[4.25rem] z-[90] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-md border border-emerald-500/35 bg-black/80 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-100/90 shadow-lg backdrop-blur-sm"
        aria-hidden
      >
        Wormhole 10 preview — wormhole5 GL + cosmic nebula behind
      </p>
      <CosmicBackdrop />
      {/*
        Julia clears opaque black; without blending the cosmic canvas underneath is fully hidden.
        Screen blend lets near-black pixels show the nebula layer (additive rings stay bright).
      */}
      <div className="pointer-events-none fixed inset-0 z-[1] mix-blend-screen">
        <WormholeJuliaThreeBackdrop
          helixLab
          ringGrowthInversion
          throatCameraJourney
          introRingsOverlay
        />
      </div>
      <Wormhole4AtmosphereOverlayGate />
      <LocalTunnelChrome
        showWormholeControls
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
