'use client';

import type { ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

import { motionPrefs } from '@/core/motion';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { Wormhole4AtmosphereOverlay } from '@/components/wormhole/Wormhole4AtmosphereOverlay';
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
  WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP,
  WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH,
  WORMHOLE_HOME_INTRO_LOGO_FADE_START,
} from '@/lib/wormholePageConfig';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/** Portal sweep + logo fade duration (runs every full page load — no session skip). */
const INTRO_MS = 4800;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function homeIntroLogoOpacity(linearIntro01: number): number {
  const s = WORMHOLE_HOME_INTRO_LOGO_FADE_START;
  if (linearIntro01 <= s) return 0;
  return easeInOutCubic((linearIntro01 - s) / (1 - s));
}

/**
 * Production home shell: same Three.js stack + tunnel tuning as `/wormhole5`; no mode HUD or debug
 * panel; velocity-synced footer marquee. Also used when importing {@link Wormhole6Route} on `/`.
 */
export function Wormhole6ClientShell({ children }: { children: ReactNode }): ReactElement {
  const reduced = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );
  const introTRef = useRef(0);
  const rafId = useRef(0);
  const introStarted = useRef(false);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (reduced) {
      introTRef.current = 1;
      document.documentElement.style.setProperty('--nl-intro', '1');
      document.documentElement.style.setProperty('--nl-logo-o', '1');
      return;
    }
    introTRef.current = 0;
    document.documentElement.style.setProperty('--nl-intro', '0');
    document.documentElement.style.setProperty('--nl-logo-o', '0');
  }, [reduced]);

  const onPreloaderGone = useCallback(() => {
    if (reduced) return;
    if (introStarted.current) return;
    introStarted.current = true;

    const touchPrimary = isCoarseOrTouchPrimaryViewport();
    const depthFinal = touchPrimary
      ? WORMHOLE6_MOBILE_TUNNEL_START.depth
      : WORMHOLE5_TUNNEL_START.depth;
    const delta = touchPrimary
      ? WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH
      : WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP;
    const maxDepth = Math.max(1, tunnelStore.getState().maxDepth);
    const depthStart = Math.min(depthFinal + delta, maxDepth);

    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / INTRO_MS);
      const e = easeInOutCubic(u);
      introTRef.current = e;
      const sweepDepth = depthStart + (depthFinal - depthStart) * e;
      const logoO = homeIntroLogoOpacity(u);

      if (document.documentElement) {
        document.documentElement.style.setProperty('--nl-intro', String(e));
        document.documentElement.style.setProperty('--nl-logo-o', String(logoO));
      }

      tunnelStore.setState({ wormholeIntroDepthOverride: sweepDepth });

      if (u < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        introTRef.current = 1;
        document.documentElement.style.setProperty('--nl-intro', '1');
        document.documentElement.style.setProperty('--nl-logo-o', '1');
        tunnelStore.setState({
          wormholeIntroDepthOverride: null,
          depth: depthFinal,
          velocity: 0,
          scrollInputIdle: 1,
        });
      }
    };
    rafId.current = requestAnimationFrame(step);
  }, [reduced]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  useLayoutEffect(() => {
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
    const prevIntroDepthOv = s.wormholeIntroDepthOverride;
    const touchPrimary = isCoarseOrTouchPrimaryViewport();

    tunnelStore.setState({
      sensitivity: WORMHOLE4_SENSITIVITY,
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
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
        journeyCameraFromStart
        helixLabFullscreen
      />
      <Wormhole4AtmosphereOverlay fullscreenBleed />
      <LocalTunnelChrome
        showWormholeControls
        showModeToggle={false}
        showDebugPanel={false}
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
      />
      <LandingTopNav />
      <div className="relative z-10 wormhole-home-intro-logo">{children}</div>
      <WormholeCoinSyncedMarqueeFooter />
      <SitePreloader onGone={onPreloaderGone} />
    </div>
  );
}
