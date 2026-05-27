'use client';

import type { CSSProperties, ReactNode, ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

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
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import {
  WORMHOLE2_HELIX_LAB_POSTFX,
  WORMHOLE4_SENSITIVITY,
  WORMHOLE5_COARSE_TOUCH_RENDER_TUNING,
  WORMHOLE5_DEBUG_START,
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT,
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX,
  WORMHOLE5_INTRO_LOGO_START_TZ_PX,
  WORMHOLE5_INTRO_DEPTH_PULLBACK_MS,
  WORMHOLE5_INTRO_DEPTH_START,
  WORMHOLE5_TUNNEL_START,
  WORMHOLE5_TUNNEL_LAB_DEFAULTS,
  WORMHOLE20_TUNNEL_LAB_DEFAULTS,
  WORMHOLE_CLASSIC_TUNNEL,
} from '@/lib/wormholePageConfig';
import {
  disableWormholeAmbientEqualizer,
  enableWormholeAmbientEqualizer,
} from '@/audio/wormholeAmbientEqualizer';
import { clearAllIntros, getActiveIntro, getIntroDurationMs, initActiveIntro, runActiveIntro } from '@/intros/introRegistry';
import { clearStageReveal, initStageReveal } from '@/lib/stageReveal';
import { wormholeHomeIntroFreezeTranslateZOnProduction } from '@/lib/wormholeHomeIntroEasing';
import { runWormholeHeroStageReveal, wormholeHeroStageRevealAmbientFadeOpts } from '@/lib/wormholeHeroStageReveal';
import { runWormhole5ParallelCamIntro } from '@/lib/wormhole5ParallelCamIntro';
import { OrientationTransitionFade } from '@/components/landing/OrientationTransitionFade';
import { Wormhole5AmbientNavToggle } from '@/components/landing/Wormhole5AmbientNavToggle';
import { useGalaxyFoldViewportClass, useWormholeHeroFocalPoint } from '@/hooks/useWormholeHeroFocalPoint';
import {
  isWormhole5AmbientAudioRoute,
  startWormhole5AmbientImmediate,
  startWormhole5AmbientSyncedFade,
  subscribeWormhole5AmbientAudio,
} from '@/audio/wormhole5AmbientAudio';
import { WormholeLabIntroProvider } from '@/components/wormhole/WormholeLabIntroContext';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

const RANDOM_CAM_TILT_AMOUNT_STORAGE_KEY = 'nl-wormhole-random-cam-tilt-amount';

function devRandomCamTiltAmount(): number {
  if (typeof window === 'undefined') return WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT;
  if (!isLocalhostHostname(window.location.hostname)) {
    return WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT;
  }
  const raw = localStorage.getItem(RANDOM_CAM_TILT_AMOUNT_STORAGE_KEY);
  if (raw == null) return WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT;
  const v = Number(raw);
  if (!Number.isFinite(v)) return WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT;
  return Math.min(WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX, Math.max(0, v));
}

/**
 * `/wormhole5` — helix-lab 3D ribbons (as `/wormhole2`) **plus** wormhole4 inverted Julia rings,
 * journey camera, intro mouth rings, atmosphere; **locked** at intro depth then mouth with no idle drift.
 *
 * `localHomePresentation`: home `/` — same tunnel store init as `/wormhole5`; hides locked/free HUD, tunnel debug,
 * and lab intro chrome; marquee footer + stage-reveal hero intro.
 *
 * Hero intro follows THREE_INTRO_SEQUENCES.md when tunnel debug is available; localhost `localHomePresentation` keeps
 * {@link runWormholeHeroStageReveal} only. `wormholeHomeIntroCam01` feeds the hero coin camera.
 */
export function Wormhole5ClientShell({
  children,
  localHomePresentation = false,
  /** `/wormhole20` — identical wormhole5 stack + FFT Julia equalizer (localhost dev). */
  juliaEqualizerLab = false,
}: {
  children: ReactNode;
  localHomePresentation?: boolean;
  juliaEqualizerLab?: boolean;
}): ReactElement {
  const ambientAudio = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    isWormhole5AmbientAudioRoute,
    () => false,
  );
  const ambientFadeCancel = useRef<(() => void) | null>(null);
  const depthPullRaf = useRef(0);
  const stageRevealCancel = useRef({ cancel: () => {} });
  const introStarted = useRef(false);

  useEffect(() => {
    if (!juliaEqualizerLab) return;
    enableWormholeAmbientEqualizer();
    return () => disableWormholeAmbientEqualizer();
  }, [juliaEqualizerLab]);

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
      if (ambientAudio) {
        startWormhole5AmbientImmediate();
      }
      return;
    }
    if (introStarted.current) return;
    introStarted.current = true;

    runDepthPullback();
    if (ambientAudio) {
      ambientFadeCancel.current = startWormhole5AmbientSyncedFade(
        wormholeHeroStageRevealAmbientFadeOpts(),
      );
    }
    if (localHomePresentation) {
      stageRevealCancel.current = runWormholeHeroStageReveal({ introTranslateZ: true });
    } else {
      stageRevealCancel.current = runLabIntroSequence();
    }
  }, [runDepthPullback, localHomePresentation, runLabIntroSequence, ambientAudio]);

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
    const prevRandomCamTiltAmount = s.wormholeDebugRandomCamTiltAmount;
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
    const prevIters = s.iters;
    const prevSensitivity = s.sensitivity;
    const prevScrollInputIdle = s.scrollInputIdle;
    const prevHomeIntroCam = s.wormholeHomeIntroCam01;
    const prevIntroDepthOv = s.wormholeIntroDepthOverride;
    const prevWormhole8HelixBoost = s.wormhole8HelixBoostEnabled;
    const prevJourneyMouseParallax = s.wormholeJourneyMouseParallax;
    const prevWormhole5HelixCoinRefl = s.wormhole5CoinHelixReflectionEnabled;
    const prevWormhole5DriftMoteFaceRefl = s.wormhole5CoinDriftMoteFaceReflectionEnabled;
    const prevWormhole5LiveParticleFaceRefl = s.wormhole5CoinDriftMoteLiveParticleReflectionEnabled;
    const prevWormhole5CinematicSpinLight = s.wormhole5CoinCinematicSpinLightingEnabled;
    const prevZoomRate = s.zoomRate;
    const prevHoleRadius = s.holeRadius;
    const prevJuliaSync = s.wormholeDebugJuliaAmbientSync;
    const prevJuliaSyncRate = s.wormholeDebugJuliaAmbientSyncRate;
    const prevJuliaEq = s.wormholeDebugJuliaAmbientEqualizer;
    const prevJuliaEqStrength = s.wormholeDebugJuliaAmbientEqualizerStrength;
    const prevDriftMotesIdleBuzz = s.wormholeDebugDriftMotesIdleBuzz;
    const prevCoinFollowCam = s.wormholeCoinFollowCamEnabled;
    const prevCoinFollowCamStrength = s.wormholeCoinFollowCamStrength;
    const tunnelLabDefaults = juliaEqualizerLab
      ? WORMHOLE20_TUNNEL_LAB_DEFAULTS
      : WORMHOLE5_TUNNEL_LAB_DEFAULTS;

    const introDepth = WORMHOLE5_INTRO_DEPTH_START;
    const touchPrimary =
      typeof window !== 'undefined' && isCoarseOrTouchPrimaryViewport();
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
      /** Lab screenshot — ribbon boost off, mouse parallax off, bloom/fog as tuned in debug panel. */
      wormhole8HelixBoostEnabled: false,
      wormholeDebugRandomCamTilt: false,
      wormholeDebugRandomCamTiltAmount: devRandomCamTiltAmount(),
      wormholeDebugCircularCamTilt: false,
      wormholeJourneyMouseParallax: 'off',
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
      wormhole5CoinDriftMoteFaceReflectionEnabled: false,
      wormhole5CoinDriftMoteLiveParticleReflectionEnabled: false,
      wormhole5CoinCinematicSpinLightingEnabled: false,
      ...tunnelLabDefaults,
      ...(touchPrimary ? WORMHOLE5_COARSE_TOUCH_RENDER_TUNING : {}),
      /** Last so nothing in the spread can override; wormhole5 always boots in locked scroll (not free fly). */
      mode: 'locked',
    });

    /** Beat Strict Mode remount / any same-tick store writes so HUD + scroll integrator stay locked. */
    queueMicrotask(() => tunnelStore.setState({ mode: 'locked' }));

    return () => {
      cancelAnimationFrame(depthPullRaf.current);
      ambientFadeCancel.current?.();
      ambientFadeCancel.current = null;
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
        wormholeDebugRandomCamTiltAmount: prevRandomCamTiltAmount,
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
        iters: prevIters,
        wormhole8HelixBoostEnabled: prevWormhole8HelixBoost,
        wormholeJourneyMouseParallax: prevJourneyMouseParallax,
        wormhole5CoinHelixReflectionEnabled: prevWormhole5HelixCoinRefl,
        wormhole5CoinDriftMoteFaceReflectionEnabled: prevWormhole5DriftMoteFaceRefl,
        wormhole5CoinDriftMoteLiveParticleReflectionEnabled: prevWormhole5LiveParticleFaceRefl,
        wormhole5CoinCinematicSpinLightingEnabled: prevWormhole5CinematicSpinLight,
        zoomRate: prevZoomRate,
        holeRadius: prevHoleRadius,
        wormholeCoinFollowCamEnabled: prevCoinFollowCam,
        wormholeCoinFollowCamStrength: prevCoinFollowCamStrength,
        wormholeDebugDriftMotesIdleBuzz: prevDriftMotesIdleBuzz,
        ...(juliaEqualizerLab
          ? {
              wormholeDebugJuliaAmbientSync: prevJuliaSync,
              wormholeDebugJuliaAmbientSyncRate: prevJuliaSyncRate,
              wormholeDebugJuliaAmbientEqualizer: prevJuliaEq,
              wormholeDebugJuliaAmbientEqualizerStrength: prevJuliaEqStrength,
            }
          : {}),
      });
    };
  }, [localHomePresentation, juliaEqualizerLab]);

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

  const heroFocalVars = useWormholeHeroFocalPoint(localHomePresentation);
  const foldViewportClass = useGalaxyFoldViewportClass();

  return (
    <div
      className={[
        'relative flex min-h-[100dvh] w-full flex-col bg-[#030208]',
        localHomePresentation ? 'wormhole5-home-route' : 'wormhole5-route',
      ].join(' ')}
      style={localHomePresentation ? (heroFocalVars as CSSProperties) : undefined}
      data-fold-viewport={localHomePresentation ? foldViewportClass : undefined}
    >
      {juliaEqualizerLab ? (
        <p
          className="pointer-events-none fixed left-1/2 top-[4.25rem] z-[90] max-w-[min(92vw,30rem)] -translate-x-1/2 rounded-md border border-fuchsia-500/40 bg-black/80 px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-fuchsia-100/90 shadow-lg backdrop-blur-sm"
          aria-hidden
        >
          Wormhole 20 — wormhole5 + ambient sync + FFT equalizer (dev localhost:3001)
        </p>
      ) : null}
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
      <LandingTopNav menuPrepend={<Wormhole5AmbientNavToggle />} />
      {!localHomePresentation ? (
        <WormholeLabIntroProvider>
          <div className="gravity-vignette pointer-events-none fixed inset-0 z-[8]" aria-hidden />
          <div className="wormhole-hero-perspective-root relative z-10 flex min-h-0 flex-1 flex-col [perspective:1600px]">
            <div className="wormhole5-hero-logo wormhole-lab-micro-intro-logo flex min-h-0 flex-1 flex-col [transform-style:preserve-3d]">
              {children}
            </div>
          </div>
        </WormholeLabIntroProvider>
      ) : (
        <div className="wormhole-hero-perspective-root relative z-10 flex min-h-0 flex-1 flex-col [perspective:1600px]">
          <div className="wormhole5-hero-logo wormhole-lab-micro-intro-logo flex min-h-0 flex-1 flex-col [transform-style:preserve-3d]">
            {children}
          </div>
        </div>
      )}
      {localHomePresentation ? <WormholeCoinSyncedMarqueeFooter /> : null}
      <OrientationTransitionFade />
      <SitePreloader
        wormhole5AmbientAudio={ambientAudio}
        onFadeComplete={onPreloaderGone}
      />
    </div>
  );
}
