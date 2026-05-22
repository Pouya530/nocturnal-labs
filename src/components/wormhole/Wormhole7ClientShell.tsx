'use client';

import type { ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { motionPrefs } from '@/core/motion';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { Wormhole4AtmosphereOverlayGate } from '@/components/wormhole/Wormhole4AtmosphereOverlayGate';
import { WormholeCoinSyncedMarqueeFooter } from '@/components/wormhole/WormholeCoinSyncedMarqueeFooter';
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
  WORMHOLE6_MOBILE_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import { clearStageReveal, initStageReveal } from '@/lib/stageReveal';
import { runWormholeHeroStageReveal } from '@/lib/wormholeHeroStageReveal';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/wormhole7` preview only: same tunnel store + chrome pattern as production home (`Wormhole6ClientShell`),
 * but Three.js matches `/wormhole5` — intro mouth rings, no `helixLabFullscreen`, no `journeyCameraFromStart`
 * (journey eases in from the mouth). Atmosphere gate matches wormhole4/5.
 */
export function Wormhole7ClientShell({ children }: { children: ReactNode }): ReactElement {
  const stageRevealCancel = useRef({ cancel: () => {} });
  const introStarted = useRef(false);
  const [showTunnelDebugPanel, setShowTunnelDebugPanel] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowTunnelDebugPanel(isLocalhostHostname(window.location.hostname));
  }, []);

  useLayoutEffect(() => {
    introStarted.current = false;
    const reducedNow = motionPrefs.reduced;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--nl-intro', '1');
    }
    initStageReveal();

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
      wormholeHomeIntroCam01: reducedNow ? 1 : 0,
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
      stageRevealCancel.current.cancel();
      clearStageReveal();
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
    const reducedNow = motionPrefs.reduced;
    if (reducedNow) {
      tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
      return;
    }
    if (introStarted.current) return;
    introStarted.current = true;

    stageRevealCancel.current = runWormholeHeroStageReveal({ introTranslateZ: false });
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <p
        className="pointer-events-none fixed left-1/2 top-[4.25rem] z-[90] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-md border border-amber-500/35 bg-black/80 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-amber-100/90 shadow-lg backdrop-blur-sm"
        aria-hidden
      >
        Wormhole 7 preview — home tunnel + wormhole5 GL (no fullscreen helix)
      </p>
      <WormholeJuliaThreeBackdrop
        helixLab
        ringGrowthInversion
        throatCameraJourney
        introRingsOverlay
      />
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
