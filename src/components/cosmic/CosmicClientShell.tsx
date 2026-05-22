'use client';

import type { ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { motionPrefs } from '@/core/motion';
import { CosmicBackdrop } from '@/components/cosmic/CosmicBackdrop';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { Wormhole4AtmosphereOverlayGate } from '@/components/wormhole/Wormhole4AtmosphereOverlayGate';
import { WormholeCoinSyncedMarqueeFooter } from '@/components/wormhole/WormholeCoinSyncedMarqueeFooter';
import {
  getActiveLandingBackdropMode,
  setActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import {
  WORMHOLE2_HELIX_LAB_POSTFX,
  WORMHOLE4_SENSITIVITY,
  WORMHOLE5_DEBUG_START,
  WORMHOLE5_TUNNEL_START,
  WORMHOLE6_MOBILE_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/cosmic` — volumetric nebula backdrop (no Julia wormhole rings). Shares tunnel store, scroll chrome,
 * preloader, and atmosphere gate with wormhole lab routes; no `wormholeHomeIntroCam01` ramp.
 */
export function CosmicClientShell({ children }: { children: ReactNode }): ReactElement {
  const [showTunnelDebugPanel, setShowTunnelDebugPanel] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowTunnelDebugPanel(isLocalhostHostname(window.location.hostname));
  }, []);

  useLayoutEffect(() => {
    const reducedNow = motionPrefs.reduced;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--nl-intro', '1');
      document.documentElement.style.setProperty('--nl-logo-o', reducedNow ? '1' : '0');
      document.documentElement.style.setProperty('--nl-logo-grow', '1');
    }

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
    const prevAtmospherePreset = s.wormholeAtmospherePreset;
    const prevCosmicOverlay = s.wormholeCosmicOverlayEnabled;
    const prevHelixJuliaRibbonShader = s.wormholeHelixJuliaRibbonShaderEnabled;
    const prevHelixTubeVariant = s.wormholeHelixTubeVariant;
    const prevHelixTubeJuliaPatternEnabled = s.wormholeHelixTubeJuliaPatternEnabled;
    const prevBloomStrength = s.bloomStrength;
    const prevBloomRadius = s.bloomRadius;
    const prevBloomThreshold = s.bloomThreshold;
    const prevFogDensity = s.fogDensity;
    const prevSensitivity = s.sensitivity;
    const prevScrollInputIdle = s.scrollInputIdle;
    const prevIntroDepthOv = s.wormholeIntroDepthOverride;
    const prevHomeIntroCam = s.wormholeHomeIntroCam01;
    const touchPrimary = isCoarseOrTouchPrimaryViewport();

    tunnelStore.setState({
      sensitivity: WORMHOLE4_SENSITIVITY,
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
      wormholeIntroDepthOverride: null,
      wormholeHomeIntroCam01: 1,
      depth: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.depth : WORMHOLE5_TUNNEL_START.depth,
      velocity: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.velocity : WORMHOLE5_TUNNEL_START.velocity,
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
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--nl-logo-grow');
        document.documentElement.style.removeProperty('--nl-logo-o');
      }
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
        wormholeIntroDepthOverride: prevIntroDepthOv,
        wormholeHomeIntroCam01: prevHomeIntroCam,
        wormholeScrollVisualMul: prevScrollVisualMul,
        wormholeScrollHelixVelGain: prevScrollHelixVelGain,
        wormhole3dBackgroundEnabled: prevWormhole3d,
        wormholeHelices3dEnabled: prevHelices3d,
        wormholeDebugRandomCamTilt: prevRandomCamTilt,
        wormholeDebugCircularCamTilt: prevCircularCamTilt,
        wormholeCoinVisible: prevCoinVisible,
        wormholeCoinClickTunnelBoost: prevCoinClickTunnelBoost,
        wormholeBlackHoleOverlayEnabled: prevBlackHoleOverlay,
        wormholeAtmospherePreset: prevAtmospherePreset,
        wormholeCosmicOverlayEnabled: prevCosmicOverlay,
        wormholeHelixJuliaRibbonShaderEnabled: prevHelixJuliaRibbonShader,
        wormholeHelixTubeVariant: prevHelixTubeVariant,
        wormholeHelixTubeJuliaPatternEnabled: prevHelixTubeJuliaPatternEnabled,
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

  const onPreloaderGone = useCallback(() => {
    tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--nl-logo-o', '1');
      document.documentElement.style.setProperty('--nl-logo-grow', '1');
    }
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <p
        className="pointer-events-none fixed left-1/2 top-[4.25rem] z-[90] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-md border border-violet-500/40 bg-black/80 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-orange-100/90 shadow-lg backdrop-blur-sm"
        aria-hidden
      >
        Cosmic preview — volumetric nebula + Julia blend (experimental)
      </p>
      <CosmicBackdrop />
      <Wormhole4AtmosphereOverlayGate />
      <LocalTunnelChrome
        showWormholeControls
        showModeToggle={false}
        showDebugPanel={showTunnelDebugPanel}
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <div className="relative z-10 wormhole-home-intro-logo">{children}</div>
      <WormholeCoinSyncedMarqueeFooter />
      <SitePreloader onFadeComplete={onPreloaderGone} />
    </div>
  );
}
