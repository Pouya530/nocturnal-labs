'use client';

import type { ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { motionPrefs } from '@/core/motion';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { SitePreloader } from '@/components/landing/SitePreloader';
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
  WORMHOLE_HOME_DESKTOP_PROD_TUNNEL,
  WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP,
  WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH,
  WORMHOLE_HOME_TUNNEL_VISUAL,
  wormholeHomeIntroDepthPullbackMs,
} from '@/lib/wormholePageConfig';
import { wormholeDesktopProductionHighQuality } from '@/lib/wormholeProductionQuality';
import {
  wormholeHomeIntroCam01FromDepthEased,
  wormholeHomeIntroDepthEased,
  wormholeHomeIntroFreezeTranslateZOnProduction,
} from '@/lib/wormholeHomeIntroEasing';
import { WORMHOLE5_INTRO_LOGO_START_TZ_PX } from '@/lib/wormholePageConfig';
import { clearStageReveal, initStageReveal } from '@/lib/stageReveal';
import { runWormholeHeroStageReveal } from '@/lib/wormholeHeroStageReveal';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * Production home shell (`/` and `/wormhole6`): inversion Julia rings + journey camera; intro depth pullback from
 * {@link WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP} / `_TOUCH`; pullback ms via {@link wormholeHomeIntroDepthPullbackMs}. `helixLabFullscreen` scales the lab helix bundle for full-viewport fill (same multipliers as
 * `wormholePageConfig` home stack). Ribbon **shader** grading matches `/wormhole5` (softer rim, halo, brightness) —
 * do not set `helixWormhole2RibbonStyle`, which would switch ribbons to the `/wormhole2` look. Tunnel debug on
 * localhost only ({@link LocalTunnelChrome} `showDebugPanel`).
 */
export function Wormhole6ClientShell({ children }: { children: ReactNode }): ReactElement {
  const depthPullRaf = useRef(0);
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
    if (typeof document !== 'undefined' && !reducedNow && wormholeHomeIntroFreezeTranslateZOnProduction()) {
      const root = document.documentElement;
      root.dataset.nlIntroTz = 'progress';
      root.style.setProperty('--nl-logo-tz-start', `${WORMHOLE5_INTRO_LOGO_START_TZ_PX}px`);
      root.style.removeProperty('--nl-logo-tz');
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
    const prevJourneyMouseParallax = s.wormholeJourneyMouseParallax;
    const touchPrimary = isCoarseOrTouchPrimaryViewport();
    const introSettleDepth = touchPrimary
      ? WORMHOLE6_MOBILE_TUNNEL_START.depth
      : WORMHOLE5_TUNNEL_START.depth;
    const introPeakDepth = reducedNow
      ? introSettleDepth
      : touchPrimary
        ? WORMHOLE6_MOBILE_TUNNEL_START.depth + WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH
        : WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP;

    tunnelStore.setState({
      sensitivity: WORMHOLE4_SENSITIVITY,
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
      wormholeIntroDepthOverride: reducedNow ? null : introPeakDepth,
      wormholeHomeIntroCam01: reducedNow ? 1 : 0,
      depth: introPeakDepth,
      velocity: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.velocity : WORMHOLE5_TUNNEL_START.velocity,
      scrollInputIdle: 1,
      wormholeScrollVisualMul: -1,
      wormholeScrollHelixVelGain: -0.42,
      ...WORMHOLE5_DEBUG_START,
      wormholeHelices3dEnabled: true,
      ...WORMHOLE2_HELIX_LAB_POSTFX,
      ...WORMHOLE_HOME_TUNNEL_VISUAL,
      ...(wormholeDesktopProductionHighQuality() ? WORMHOLE_HOME_DESKTOP_PROD_TUNNEL : {}),
      wormholeJourneyMouseParallax: 'off',
      mode: 'locked',
    });

    queueMicrotask(() => tunnelStore.setState({ mode: 'locked' }));

    return () => {
      cancelAnimationFrame(depthPullRaf.current);
      stageRevealCancel.current.cancel();
      clearStageReveal();
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        delete root.dataset.nlIntroTz;
        root.style.removeProperty('--nl-logo-tz');
        root.style.removeProperty('--nl-logo-tz-start');
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
        wormholeHelixJuliaRibbonShaderEnabled: prevHelixJuliaRibbonShader,
        wormholeHelixTubeVariant: prevHelixTubeVariant,
        wormholeHelixTubeJuliaPatternEnabled: prevHelixTubeJuliaPatternEnabled,
        wormholeJourneyMouseParallax: prevJourneyMouseParallax,
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

  const runDepthPullback = useCallback(() => {
    const touchPrimary = isCoarseOrTouchPrimaryViewport();
    const from = touchPrimary
      ? WORMHOLE6_MOBILE_TUNNEL_START.depth + WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH
      : WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP;
    const to = touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.depth : WORMHOLE5_TUNNEL_START.depth;
    const dur = wormholeHomeIntroDepthPullbackMs(touchPrimary);
    const t0 = performance.now();

    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const depthEased = wormholeHomeIntroDepthEased(k);
      const d = from * (1 - depthEased) + to * depthEased;
      const cam01 = wormholeHomeIntroCam01FromDepthEased(depthEased);
      tunnelStore.setState({
        wormholeIntroDepthOverride: d,
        wormholeHomeIntroCam01: cam01,
        velocity: 0,
      });
      if (k < 1) {
        depthPullRaf.current = requestAnimationFrame(step);
      } else {
        tunnelStore.setState({
          wormholeIntroDepthOverride: null,
          depth: to,
          wormholeHomeIntroCam01: 1,
          velocity: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.velocity : WORMHOLE5_TUNNEL_START.velocity,
        });
      }
    };

    depthPullRaf.current = requestAnimationFrame(step);
  }, []);

  const onPreloaderGone = useCallback(() => {
    const reducedNow = motionPrefs.reduced;
    const touchPrimary = isCoarseOrTouchPrimaryViewport();
    const settleDepth = touchPrimary
      ? WORMHOLE6_MOBILE_TUNNEL_START.depth
      : WORMHOLE5_TUNNEL_START.depth;
    if (reducedNow) {
      tunnelStore.setState({
        wormholeHomeIntroCam01: 1,
        wormholeIntroDepthOverride: null,
        depth: settleDepth,
        velocity: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.velocity : WORMHOLE5_TUNNEL_START.velocity,
      });
      return;
    }
    if (introStarted.current) return;
    introStarted.current = true;

    runDepthPullback();
    stageRevealCancel.current = runWormholeHeroStageReveal({
      introTranslateZ: true,
      driveIntroCam: false,
    });
  }, [runDepthPullback]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(depthPullRaf.current);
      stageRevealCancel.current.cancel();
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <WormholeJuliaThreeBackdrop
        helixLab
        ringGrowthInversion
        throatCameraJourney
        journeyCameraFromStart
        helixLabFullscreen
      />
      <LocalTunnelChrome
        showWormholeControls
        showModeToggle={false}
        showDebugPanel={showTunnelDebugPanel}
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <div className="wormhole-hero-perspective-root relative z-10 [perspective:1600px]">
        <div className="wormhole-home-intro-logo [transform-style:preserve-3d]">{children}</div>
      </div>
      <WormholeCoinSyncedMarqueeFooter />
      <SitePreloader onFadeComplete={onPreloaderGone} />
    </div>
  );
}
