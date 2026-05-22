'use client';

import type { ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import { LandingTopNav } from '@/components/landing/LandingTopNav';
import { LocalTunnelChrome } from '@/components/landing/LocalTunnelChrome';
import { SitePreloader } from '@/components/landing/SitePreloader';
import { WormholeCoinSyncedMarqueeFooter } from '@/components/wormhole/WormholeCoinSyncedMarqueeFooter';
import { Wormhole4AtmosphereOverlayGate } from '@/components/wormhole/Wormhole4AtmosphereOverlayGate';
import { WormholeCosmicOverlayGate } from '@/components/wormhole/WormholeCosmicOverlayGate';
import { WormholeJuliaThreeBackdrop } from '@/components/wormhole/WormholeJuliaThreeBackdrop';
import {
  getActiveLandingBackdropMode,
  setActiveLandingBackdropMode,
} from '@/lib/landingBackdropMode';
import {
  WORMHOLE2_HELIX_LAB_POSTFX,
  WORMHOLE4_SENSITIVITY,
  WORMHOLE5_DEBUG_START,
  WORMHOLE_HOME_DESKTOP_PROD_TUNNEL,
  WORMHOLE_HOME_TUNNEL_VISUAL,
  WORMHOLE5_INTRO_LOGO_START_TZ_PX,
  WORMHOLE5_INTRO_DEPTH_PULLBACK_MS,
  WORMHOLE5_INTRO_DEPTH_START,
  WORMHOLE5_TUNNEL_START,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import { clearAllIntros, getActiveIntro, getIntroDurationMs, initActiveIntro, runActiveIntro } from '@/intros/introRegistry';
import { clearStageReveal, initStageReveal } from '@/lib/stageReveal';
import { wormholeHomeIntroFreezeTranslateZOnProduction } from '@/lib/wormholeHomeIntroEasing';
import { wormholeDesktopProductionHighQuality } from '@/lib/wormholeProductionQuality';
import { runWormholeHeroStageReveal } from '@/lib/wormholeHeroStageReveal';
import { runWormhole5ParallelCamIntro } from '@/lib/wormhole5ParallelCamIntro';
import { WormholeLabIntroProvider } from '@/components/wormhole/WormholeLabIntroContext';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

/**
 * `/wormhole5` — helix-lab 3D ribbons (as `/wormhole2`) **plus** wormhole4 inverted Julia rings,
 * journey camera, intro mouth rings, atmosphere; **locked** at intro depth then mouth with no idle drift.
 *
 * `localHomePresentation`: localhost `/` only — no locked/free HUD or tunnel debug; marquee footer like production home.
 *
 * Hero intro follows THREE_INTRO_SEQUENCES.md when tunnel debug is available; localhost `localHomePresentation` keeps
 * {@link runWormholeHeroStageReveal} only. `wormholeHomeIntroCam01` feeds the hero coin camera.
 */
export function Wormhole5ClientShell({
  children,
  localHomePresentation = false,
}: {
  children: ReactNode;
  localHomePresentation?: boolean;
}): ReactElement {
  const depthPullRaf = useRef(0);
  const stageRevealCancel = useRef({ cancel: () => {} });
  const introStarted = useRef(false);

  const runDepthPullback = useCallback(() => {
    const t0 = performance.now();
    const from = WORMHOLE5_INTRO_DEPTH_START;
    const dur = WORMHOLE5_INTRO_DEPTH_PULLBACK_MS;

    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = easeOutCubic(k);
      const d = from * (1 - eased);
      tunnelStore.setState({ wormholeIntroDepthOverride: d, velocity: 0 });
      if (k < 1) {
        depthPullRaf.current = requestAnimationFrame(step);
      } else {
        tunnelStore.setState({
          wormholeIntroDepthOverride: null,
          depth: WORMHOLE5_TUNNEL_START.depth,
          velocity: WORMHOLE5_TUNNEL_START.velocity,
        });
      }
    };
    depthPullRaf.current = requestAnimationFrame(step);
  }, []);

  const runLabIntroSequence = useCallback((): { cancel: () => void } => {
    const active = getActiveIntro();
    if (active === 'stage-reveal') {
      return runWormholeHeroStageReveal({ introTranslateZ: true });
    }
    const dur = getIntroDurationMs(active);
    const cam = runWormhole5ParallelCamIntro(dur);
    const intro = runActiveIntro({});
    return {
      cancel: () => {
        cam.cancel();
        intro.cancel();
      },
    };
  }, []);

  const onPreloaderGone = useCallback(() => {
    const reducedNow = motionPrefs.reduced;
    if (reducedNow) {
      tunnelStore.setState({
        wormholeIntroDepthOverride: null,
        depth: WORMHOLE5_TUNNEL_START.depth,
        velocity: WORMHOLE5_TUNNEL_START.velocity,
        wormholeHomeIntroCam01: 1,
      });
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--nl-logo-tz', '0px');
      }
      return;
    }
    if (introStarted.current) return;
    introStarted.current = true;

    runDepthPullback();
    if (localHomePresentation) {
      stageRevealCancel.current = runWormholeHeroStageReveal({ introTranslateZ: true });
    } else {
      stageRevealCancel.current = runLabIntroSequence();
    }
  }, [runDepthPullback, localHomePresentation, runLabIntroSequence]);

  useLayoutEffect(() => {
    introStarted.current = false;
    document.documentElement.style.setProperty('--nl-intro', '1');

    const reducedNow = motionPrefs.reduced;
    if (!localHomePresentation) {
      initActiveIntro();
    } else {
      clearAllIntros();
      initStageReveal();
    }
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const freezeTz =
        localHomePresentation && !reducedNow && wormholeHomeIntroFreezeTranslateZOnProduction();
      if (freezeTz) {
        root.dataset.nlIntroTz = 'progress';
        root.style.setProperty('--nl-logo-tz-start', `${WORMHOLE5_INTRO_LOGO_START_TZ_PX}px`);
        root.style.removeProperty('--nl-logo-tz');
      } else {
        delete root.dataset.nlIntroTz;
        root.style.removeProperty('--nl-logo-tz-start');
        root.style.setProperty(
          '--nl-logo-tz',
          reducedNow ? '0px' : `${WORMHOLE5_INTRO_LOGO_START_TZ_PX}px`,
        );
      }
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
    const prevHelixJuliaPatternBloomMul = s.wormholeHelixJuliaPatternBloomMul;
    const prevHelixJuliaInteriorBlur = s.wormholeHelixJuliaInteriorBlur;
    const prevHelixJuliaShimmer = s.wormholeHelixJuliaShimmer;
    const prevBloomStrength = s.bloomStrength;
    const prevBloomRadius = s.bloomRadius;
    const prevBloomThreshold = s.bloomThreshold;
    const prevFogDensity = s.fogDensity;
    const prevSensitivity = s.sensitivity;
    const prevScrollInputIdle = s.scrollInputIdle;
    const prevHomeIntroCam = s.wormholeHomeIntroCam01;
    const prevIntroDepthOv = s.wormholeIntroDepthOverride;
    const prevWormhole8HelixBoost = s.wormhole8HelixBoostEnabled;
    const prevJourneyMouseParallax = s.wormholeJourneyMouseParallax;
    const prevWormhole5HelixCoinRefl = s.wormhole5CoinHelixReflectionEnabled;
    const prevZoomRate = s.zoomRate;
    const prevHoleRadius = s.holeRadius;

    const introDepth = WORMHOLE5_INTRO_DEPTH_START;
    tunnelStore.setState({
      sensitivity: WORMHOLE4_SENSITIVITY,
      maxDepth: WORMHOLE_CLASSIC_TUNNEL.maxDepth,
      wormholeIdleForward: 0,
      ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount,
      ringSpacing: WORMHOLE_CLASSIC_TUNNEL.ringSpacing,
      wormholeHomeIntroCam01: reducedNow ? 1 : 0,
      wormholeIntroDepthOverride: reducedNow ? null : introDepth,
      depth: reducedNow ? WORMHOLE5_TUNNEL_START.depth : introDepth,
      velocity: WORMHOLE5_TUNNEL_START.velocity,
      scrollInputIdle: 1,
      wormholeScrollVisualMul: -1,
      wormholeScrollHelixVelGain: -0.42,
      ...WORMHOLE5_DEBUG_START,
      /** Same as wormhole2 default — lab Julia tubes on (wormhole4 debug preset had helices off). */
      wormholeHelices3dEnabled: true,
      /** Helix glow/colour read like `/wormhole2` (wormhole4 debug bloom is much weaker). */
      ...WORMHOLE2_HELIX_LAB_POSTFX,
      wormholeAtmospherePreset: 'nebula',
      /** Lab screenshot — ribbon boost off, mouse parallax off, bloom/fog as tuned in debug panel. */
      wormhole8HelixBoostEnabled: false,
      wormholeDebugRandomCamTilt: false,
      wormholeDebugCircularCamTilt: false,
      wormholeJourneyMouseParallax: 'off',
      bloomStrength: 0.3,
      bloomRadius: 0.4,
      bloomThreshold: 0,
      fogDensity: 0.004,
      /** Lab screenshot defaults for helix tube style + Julia strand controls (`/wormhole5` only). */
      wormholeHelixTubeVariant: 6,
      wormholeHelixTubeJuliaPatternEnabled: true,
      wormholeHelixJuliaPatternBloomMul: 3.5,
      wormholeHelixJuliaInteriorBlur: 1,
      wormholeHelixJuliaShimmer: 1,
      /** Ribbon-coloured helix-style reflections on the hero coin (toggle in tunnel debug on `/wormhole5`). */
      wormhole5CoinHelixReflectionEnabled: false,
      /** Last so nothing in the spread can override; wormhole5 always boots in locked scroll (not free fly). */
      mode: 'locked',
      ...(localHomePresentation
        ? {
            ...WORMHOLE_HOME_TUNNEL_VISUAL,
            ...(wormholeDesktopProductionHighQuality() ? WORMHOLE_HOME_DESKTOP_PROD_TUNNEL : {}),
          }
        : {}),
    });

    /** Beat Strict Mode remount / any same-tick store writes so HUD + scroll integrator stay locked. */
    queueMicrotask(() => tunnelStore.setState({ mode: 'locked' }));

    return () => {
      cancelAnimationFrame(depthPullRaf.current);
      stageRevealCancel.current.cancel();
      if (!localHomePresentation) {
        clearAllIntros();
      } else {
        clearStageReveal();
      }
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
        wormholeHomeIntroCam01: prevHomeIntroCam,
        wormholeIntroDepthOverride: prevIntroDepthOv,
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
        wormholeHelixJuliaPatternBloomMul: prevHelixJuliaPatternBloomMul,
        wormholeHelixJuliaInteriorBlur: prevHelixJuliaInteriorBlur,
        wormholeHelixJuliaShimmer: prevHelixJuliaShimmer,
        bloomStrength: prevBloomStrength,
        bloomRadius: prevBloomRadius,
        bloomThreshold: prevBloomThreshold,
        fogDensity: prevFogDensity,
        sensitivity: prevSensitivity,
        wormhole8HelixBoostEnabled: prevWormhole8HelixBoost,
        wormholeJourneyMouseParallax: prevJourneyMouseParallax,
        wormhole5CoinHelixReflectionEnabled: prevWormhole5HelixCoinRefl,
        zoomRate: prevZoomRate,
        holeRadius: prevHoleRadius,
      });
    };
  }, [localHomePresentation]);

  useEffect(() => {
    tunnelStore.setState({ mode: 'locked' });
  }, []);

  useEffect(() => {
    if (localHomePresentation) return undefined;
    const onReplay = () => {
      if (motionPrefs.reduced) return;
      stageRevealCancel.current.cancel();
      introStarted.current = false;
      initActiveIntro();
      introStarted.current = true;
      stageRevealCancel.current = runLabIntroSequence();
    };
    window.addEventListener('nl-replay-lab-intro', onReplay);
    return () => window.removeEventListener('nl-replay-lab-intro', onReplay);
  }, [localHomePresentation, runLabIntroSequence]);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#030208]">
      <WormholeJuliaThreeBackdrop
        helixLab
        ringGrowthInversion
        throatCameraJourney
        introRingsOverlay
        openingJourneyCameraIntro
      />
      <WormholeCosmicOverlayGate />
      <Wormhole4AtmosphereOverlayGate />
      <LocalTunnelChrome
        showWormholeControls={!localHomePresentation}
        scrollOptions={{ impulseSign: WORMHOLE_CLASSIC_TUNNEL.scrollImpulseSign }}
        showModeToggle={!localHomePresentation}
        showDebugPanel={!localHomePresentation}
        showIntroSequence={!localHomePresentation}
      />
      <LandingTopNav />
      {!localHomePresentation ? (
        <WormholeLabIntroProvider>
          <div className="gravity-vignette pointer-events-none fixed inset-0 z-[8]" aria-hidden />
          <div className="wormhole-hero-perspective-root relative z-10 [perspective:1600px]">
            <div className="wormhole5-hero-logo wormhole-lab-micro-intro-logo [transform-style:preserve-3d]">
              {children}
            </div>
          </div>
        </WormholeLabIntroProvider>
      ) : (
        <div className="wormhole-hero-perspective-root relative z-10 [perspective:1600px]">
          <div className="wormhole5-hero-logo wormhole-lab-micro-intro-logo [transform-style:preserve-3d]">
            {children}
          </div>
        </div>
      )}
      {localHomePresentation ? <WormholeCoinSyncedMarqueeFooter /> : null}
      <SitePreloader onFadeComplete={onPreloaderGone} />
    </div>
  );
}
