'use client';

// REMINDER: Remove the cyan preview banner block before promoting this
// component to / (homepage). Search for "Wormhole 9 preview" string.

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
  WORMHOLE6_MOBILE_TUNNEL_START,
  WORMHOLE9_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
  WORMHOLE_HOME_MICRO_INTRO_LOGO_DELAY,
  WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE,
  WORMHOLE_HOME_MICRO_INTRO_MS,
} from '@/lib/wormholePageConfig';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

/**
 * `/wormhole9` — wormhole5 GL stack plus `journeyCameraFromStart` (intro cam ramp) and a conservative
 * `helixWallInsetMul` bump for ribbons. Homepage candidate; does not alter `/wormhole5`.
 */
export function Wormhole9ClientShell({ children }: { children: ReactNode }): ReactElement {
  const introRaf = useRef(0);
  const introStarted = useRef(false);
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
      document.documentElement.style.setProperty(
        '--nl-logo-grow',
        reducedNow ? '1' : String(WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE),
      );
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
    const prevAtmosphereOverlay = s.wormholeAtmosphereOverlayEnabled;
    const prevHelixJuliaRibbonShader = s.wormholeHelixJuliaRibbonShaderEnabled;
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
      depth: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.depth : WORMHOLE9_TUNNEL_START.depth,
      velocity: touchPrimary ? WORMHOLE6_MOBILE_TUNNEL_START.velocity : WORMHOLE9_TUNNEL_START.velocity,
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
      cancelAnimationFrame(introRaf.current);
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

  const onPreloaderGone = useCallback(() => {
    const reducedNow = motionPrefs.reduced;
    if (reducedNow) {
      tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--nl-logo-o', '1');
        document.documentElement.style.setProperty('--nl-logo-grow', '1');
      }
      return;
    }
    if (introStarted.current) return;
    introStarted.current = true;

    const t0 = performance.now();
    const duration = WORMHOLE_HOME_MICRO_INTRO_MS;
    const logoDelay = WORMHOLE_HOME_MICRO_INTRO_LOGO_DELAY;
    const scaleStart = WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE;

    const step = (now: number) => {
      const linear = Math.min(1, (now - t0) / duration);
      const camEase = easeOutCubic(linear);
      tunnelStore.setState({ wormholeHomeIntroCam01: camEase });

      const logoGrow = scaleStart + (1 - scaleStart) * easeOutCubic(linear);

      let logoO = 0;
      if (linear > logoDelay) {
        logoO = easeOutCubic((linear - logoDelay) / Math.max(1e-6, 1 - logoDelay));
      }
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--nl-logo-grow', String(logoGrow));
        document.documentElement.style.setProperty('--nl-logo-o', String(logoO));
      }

      if (linear < 1) {
        introRaf.current = requestAnimationFrame(step);
      } else {
        tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--nl-logo-o', '1');
          document.documentElement.style.setProperty('--nl-logo-grow', '1');
        }
      }
    };
    introRaf.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(introRaf.current);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <p
        className="pointer-events-none fixed left-1/2 top-[4.25rem] z-[90] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-md border border-cyan-500/35 bg-black/80 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-cyan-100/90 shadow-lg backdrop-blur-sm"
        aria-hidden
      >
        Wormhole 9 preview — wormhole5 GL + intro cam ramp + boosted ribbons (homepage candidate)
      </p>
      <WormholeJuliaThreeBackdrop
        helixLab
        ringGrowthInversion
        throatCameraJourney
        introRingsOverlay
        journeyCameraFromStart
        helixWallInsetMul={1.0}
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
      <SitePreloader onGone={onPreloaderGone} />
    </div>
  );
}
