'use client';

import { wormholeCoinScrollCameraStorePatch } from '@/lib/wormholeCoinScrollCamera';
import {
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
} from '@/lib/wormholePageConfig';
import type { WormholeAtmospherePreset } from '@/tunnel/wormholeAtmospherePreset';
import type { WormholeHelixTubeVariant } from '@/tunnel/wormholeHelixTubePreset';
import type { WormholeJourneyMouseParallaxMode } from '@/tunnel/wormholeJourneyMouseParallax';
import type { WormholeHelixQualityPresetId } from '@/tunnel/wormholeHelixQuality';
import type { WormholeTunnelQualityPresetId } from '@/tunnel/wormholeTunnelQuality';

/**
 * Lightweight tunnel state (Zustand-shaped) without an extra runtime dependency.
 * Used only when `isLocalhostHostname` is true in the browser.
 */
export type ScrollMode = 'locked' | 'free';

export type { WormholeAtmospherePreset } from '@/tunnel/wormholeAtmospherePreset';
export type { WormholeHelixTubeVariant } from '@/tunnel/wormholeHelixTubePreset';
export type { WormholeJourneyMouseParallaxMode } from '@/tunnel/wormholeJourneyMouseParallax';

export type TunnelState = {
  mode: ScrollMode;
  depth: number;
  velocity: number;
  /**
   * 1 = no scroll input recently (wheel / touch pan / locked arrow nudge); eases to 0 while the
   * user is actively scrolling. Used for UI (e.g. coin “tube fall” while pushing scroll) independent of tunnel
   * velocity, which can coast for a long time after input stops.
   */
  scrollInputIdle: number;
  sensitivity: number;
  friction: number;
  juliaCx: number;
  juliaCy: number;
  discRadius: number;
  iters: number;
  zoomRate: number;
  holeRadius: number;
  spiralPhase: number;
  paletteOffset: number;
  paletteSpeed: number;
  spinSpeed: number;
  /** Scroll clamp upper bound (`useScrollDepth`). Default 256; wormhole uses a larger range. */
  maxDepth: number;
  /** Locked-mode forward drift units/sec when |velocity| is tiny (wormhole flight). 0 = off. */
  wormholeIdleForward: number;
  /** Julia wormhole scene (Three.js) — live bloom + fog tuning via store. */
  ringCount: number;
  ringSpacing: number;
  ringRadius: number;
  helixCount: number;
  particleCount: number;
  fogDensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  /** `/wormhole` UI — debug panel can hide the hero coin for backdrop preview. */
  wormholeCoinVisible: boolean;
  /** `JuliaWormholeBackdrop` (Three.js tube) — debug / `/wormhole2` can turn off to show 2D vortex only. */
  wormhole3dBackgroundEnabled: boolean;
  /** `JuliaWormholeBackdrop` — tube helices (classic ribbons + wormhole2 lab strands). */
  wormholeHelices3dEnabled: boolean;
  /**
   * `/wormhole4` — multiply `LogoCoin` spin direction from scroll velocity (`1` default, `-1` flips).
   */
  wormholeScrollVisualMul: number;
  /**
   * `/wormhole4` — extra helix `rotation.z` drift from `velocity * dt * gain` (`0` = off).
   */
  wormholeScrollHelixVelGain: number;
  /** Tunnel debug — `JuliaWormholeBackdrop`: random view tilt while scrolling the wormhole. */
  wormholeDebugRandomCamTilt: boolean;
  /**
   * Scales random scroll tilt targets when {@link wormholeDebugRandomCamTilt} is on (`1` = lab default).
   */
  wormholeDebugRandomCamTiltAmount: number;
  /** Tunnel debug — slow circular pitch/yaw drift on the tunnel camera (idle “orbit” feel). */
  wormholeDebugCircularCamTilt: boolean;
  /**
   * When true, {@link JuliaWormholeBackdrop} offsets `camera.lookAt` from {@link HERO_FOCAL_POINT} so the
   * tube mouth aligns with the hero coin anchor (same source as CSS `--hero-focal-*-frac`).
   */
  wormholeDebugHeroFocalSync: boolean;
  /**
   * Tunnel debug — apply `--hero-coin-debug-size` from % of baselines (292 desktop, 280 mobile portrait).
   */
  wormholeDebugCoinSizeOverride: boolean;
  /** % of {@link HERO_COIN_BASELINE_DESKTOP_PX} (100 = original, 120 = +20%). */
  wormholeDebugCoinSizeDesktopPct: number;
  /** % of {@link HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX} before `--hero-logo-scale: 1.5`. */
  wormholeDebugCoinSizeMobilePct: number;
  /** Bumped on debug rebuild / apply so focal + coin anchor styles refresh. */
  wormholeDebugCoinSizeRevision: number;
  /**
   * Journey / throat: pointer nudges `camera.lookAt` slightly (parallax). Does not change scroll.
   */
  wormholeJourneyMouseParallax: WormholeJourneyMouseParallaxMode;
  /** Tunnel debug — show `BlackHoleOverlay` under the hero coin on wormhole lab routes. */
  wormholeBlackHoleOverlayEnabled: boolean;
  /**
   * Tunnel debug (localhost): hero coin tap / Space / Enter queues a scroll “up” impulse instead of the coin toss
   * ({@link queueWormholeCoinScrollBoost}).
   */
  wormholeCoinClickTunnelBoost: boolean;
  /**
   * Tunnel debug: when true, hero coin fades slightly while scrolling forward (depth increasing —
   * positive velocity above locked cruise drift when `wormholeIdleForward` is set).
   */
  wormholeCoinFadeOnScrollForward: boolean;
  /**
   * Screen-space atmosphere / vignette above the GL tunnel (`off` or one of the lab presets).
   * Tunneled routes may force `off` on entry; debug panel cycles presets on localhost.
   */
  wormholeAtmospherePreset: WormholeAtmospherePreset;
  /**
   * `/wormhole5` (and localhost home clone): second WebGL pass — {@link CosmicBackdrop} stacked above
   * {@link JuliaWormholeBackdrop} with screen blending so nebula / stream add on without replacing the tunnel.
   */
  wormholeCosmicOverlayEnabled: boolean;
  /**
   * Localhost + `helixLab`: use Julia tube fragment shader (`uMode > 1.5`); when false, solid additive ribbons.
   */
  wormholeHelixJuliaRibbonShaderEnabled: boolean;
  /**
   * When Julia helix tubes are on: fragment style index (`0` classic, `1`–`6` lab presets in `juliaWormholeShaderSources`).
   */
  wormholeHelixTubeVariant: WormholeHelixTubeVariant;
  /** When false, helix tubes use smooth bands only (no Julia fractal detail inside the strand). */
  wormholeHelixTubeJuliaPatternEnabled: boolean;
  /**
   * Helix lab + Julia pattern on: scales tube interior RGB before the scene bloom pass (1 = default).
   * Does not affect rings, sky, or helix tubes when the interior pattern is off.
   */
  wormholeHelixJuliaPatternBloomMul: number;
  /**
   * Helix + Julia pattern on: multi-tap smoothing in Julia space (0 = off, ~0.5 = softer seams).
   */
  wormholeHelixJuliaInteriorBlur: number;
  /**
   * Helix + Julia pattern on: slow shimmer on strand brightness (0 = off).
   */
  wormholeHelixJuliaShimmer: number;
  /**
   * `/wormhole5` + tunnel debug: coloured point lights near **front/back** faces evoking tunnel drift-mote
   * buzz (idle shimmer + scroll-linked pulse). `/wormhole20` lab uses the same flag.
   */
  wormhole5CoinDriftMoteFaceReflectionEnabled: boolean;
  /**
   * `/wormhole5` debug: project **live** tunnel drift-mote positions onto coin faces instead of virtual
   * stand-in motes — compare against the approximation toggle above.
   */
  wormhole5CoinDriftMoteLiveParticleReflectionEnabled: boolean;
  /**
   * `/wormhole5` debug: cinematic polished-metal spin lighting — fixed left/right keys, env fill,
   * edge blink, bloom on face glints.
   */
  wormhole5CoinCinematicSpinLightingEnabled: boolean;
  /** `/wormhole5` only (hero coin): adds coloured point lights along helix-like paths matching Julia ribbon hues. */
  wormhole5CoinHelixReflectionEnabled: boolean;
  /**
   * `/wormhole5` debug: drive Julia shader `uTime` from ambient MP3 `currentTime` (localhost panel).
   */
  wormholeDebugJuliaAmbientSync: boolean;
  /** Scales audio playback seconds → Julia `uTime` when {@link wormholeDebugJuliaAmbientSync}. */
  wormholeDebugJuliaAmbientSyncRate: number;
  /**
   * `/wormhole20` dev lab: FFT-reactive Julia (intensity / shimmer / uTime nudge) on top of timeline sync.
   */
  wormholeDebugJuliaAmbientEqualizer: boolean;
  /** Equalizer drive strength (0–2). */
  wormholeDebugJuliaAmbientEqualizerStrength: number;
  /**
   * Tunnel ring stack + ambience quality (segments, stars, sky, motes). Helix geometry unchanged.
   * {@link wormholeTunnelQualityPreset} `auto` uses device profile; `custom` uses fields below.
   */
  wormholeTunnelQualityPreset: WormholeTunnelQualityPresetId;
  wormholeTunnelRingSegsInversion: number;
  wormholeTunnelRingSegsClassic: number;
  wormholeTunnelStarCount: number;
  wormholeTunnelSkySegW: number;
  wormholeTunnelSkySegH: number;
  wormholeTunnelParticleCap: number;
  wormholeTunnelMoteSpriteSize: 64 | 128;
  /** Increment to remount {@link JuliaWormholeBackdrop} after quality edits. */
  wormholeTunnelQualityRevision: number;
  /**
   * Tunnel debug (`/wormhole5`): keep drift-mote XY “bee buzz” when scroll is fully idle (`handsOff`).
   * Wormhole5 lab boots with this on ({@link WORMHOLE5_TUNNEL_LAB_DEFAULTS}); off matches pre-gate stillness.
   */
  wormholeDebugDriftMotesIdleBuzz: boolean;
  /**
   * Helix tube path density + ribbon shape (`helixLab` routes). Ring stack unchanged.
   * {@link wormholeHelixQualityPreset} `auto` uses device profile; `custom` uses fields below.
   */
  wormholeHelixQualityPreset: WormholeHelixQualityPresetId;
  wormholeHelixPathPts: number;
  wormholeHelixTubeRadialSegs: number;
  wormholeHelixTubeRadius: number;
  wormholeHelixTwistTurns: number;
  wormholeHelixRadialScale: number;
  wormholeHelixWobbleAmp: number;
  wormholeHelixWobbleFreq: number;
  wormholeHelixOpacity: number;
  wormholeHelixMobileBloomMul: number;
  wormholeHelixQualityRevision: number;
  /**
   * Journey camera + hero coin GL camera dollies in as the coin shrinks with depth (wormhole5).
   */
  wormholeCoinFollowCamEnabled: boolean;
  /** Scales {@link computeWormholeCoinFollowCam} dolly / FOV offsets (0–2). */
  wormholeCoinFollowCamStrength: number;
  /** Hero coin GL {@link ScrollVelocityCamera} — locked scroll into journey (zoom out). */
  wormholeCoinScrollCamLockedZPullDown: number;
  wormholeCoinScrollCamLockedFovDown: number;
  /** Locked scroll back toward mouth (zoom in). */
  wormholeCoinScrollCamLockedZPushUp: number;
  wormholeCoinScrollCamLockedFovUp: number;
  /** Extra pull-back from scroll speed (|v|), desktop locked mode. */
  wormholeCoinScrollCamLockedZSpeedAway: number;
  wormholeCoinScrollCamLockedFovSpeedAway: number;
  /** Velocity reference for scroll-speed easing (`speedNorm = |v| / velRef`). */
  wormholeCoinScrollCamVelRef: number;
  wormholeCoinScrollCamLockedVelScale: number;
  /** Increment to remount {@link LogoCoinCanvas} after scroll-camera edits. */
  wormholeCoinScrollCamRevision: number;
  /**
   * Hero coin gunmetal **cylinder edge**: seven orbiting sweep lights (LogoCoin rim kit A–G).
   */
  wormholeCoinGunmetalRimSweepLightsEnabled: boolean;
  /**
   * Hero coin: three **near-surface** point lights (same motion families, tighter radius) for edge grazing.
   */
  wormholeCoinGunmetalRimEdgeGrazeLightsEnabled: boolean;
  /**
   * Hero coin: two lights orbiting in the **plane of the rim** (tangent to the cylinder) for specular edge streaks.
   */
  wormholeCoinGunmetalRimTangentRingLightsEnabled: boolean;
  /**
   * Hero coin: animate **reed texture** UV scroll on the rim cylinder (`rimSideTex`).
   */
  wormholeCoinGunmetalRimUvMotionEnabled: boolean;
  /**
   * Hero coin: animated **emissive** tint on the gunmetal rim material (iridescent shimmer).
   */
  wormholeCoinGunmetalRimEmissiveShimmerEnabled: boolean;
  /**
   * Hero coin (dev / tunnel debug): **full-disc** emissive on front/back when that face points toward
   * the bright GL tunnel — tunnel debug toggle.
   */
  wormholeCoinBackdropFaceLightEnabled: boolean;
  /**
   * `/wormhole8` preview: apply helix wall inset boost (`helixWallInsetMul=5`) instead of base
   * wormhole5-scale inset (`0.88`).
   */
  wormhole8HelixBoostEnabled: boolean;
  /**
   * Production home intro: when non-null, {@link useScrollDepth} applies this depth and zero
   * velocity each tick instead of integrating scroll (pan/zoom settle before hand-off).
   */
  wormholeIntroDepthOverride: number | null;
  /**
   * `/` micro-intro only (`journeyCameraFromStart`): scales throat journey FOV + camera pullback toward
   * the wormhole3 mouth look (`1` = full framing). Animated `0 → 1` after the loading veil dismisses.
   */
  wormholeHomeIntroCam01: number;
  /**
   * When true, {@link JuliaWormholeBackdrop} skips its render loop (terminal preloader visible).
   * Set by {@link SitePreloader}; cleared after fade-out on a deferred frame.
   */
  wormholeTunnelRenderPaused: boolean;
  /** `/cosmic` — Julia density modulation in the volumetric raymarch (0 = off, 1.5 = strong). */
  cosmicJuliaBlend: number;
  /** `/cosmic` — scales fbm density in the nebula pass. */
  cosmicCloudDensity: number;
  /** `/cosmic` — central screen-space core brightness. */
  cosmicCoreIntensity: number;
  /** `/cosmic` — Julia feature scale in the blend (larger = finer filaments). */
  cosmicJuliaZoom: number;
};

const initial: TunnelState = {
  mode: 'locked',
  depth: 0,
  velocity: 0,
  scrollInputIdle: 1,
  sensitivity: 0.193,
  friction: 0.92,
  juliaCx: -0.7269,
  juliaCy: 0.1889,
  discRadius: 0.172,
  iters: 200,
  zoomRate: 0.25,
  holeRadius: 0.28,
  spiralPhase: 0,
  paletteOffset: 0,
  /** Tunnel Julia palette is scroll-driven only (`useScrollDepth` no longer advances this). */
  paletteSpeed: 0,
  spinSpeed: 1,
  maxDepth: 256,
  wormholeIdleForward: 0,
  ringCount: 72,
  ringSpacing: 4,
  ringRadius: 8,
  helixCount: 3,
  particleCount: 2400,
  fogDensity: 0.018,
  bloomStrength: 0.65,
  bloomRadius: 1.5,
  bloomThreshold: 0.02,
  wormholeCoinVisible: true,
  wormhole3dBackgroundEnabled: true,
  wormholeHelices3dEnabled: true,
  wormholeScrollVisualMul: 1,
  wormholeScrollHelixVelGain: 0,
  wormholeDebugRandomCamTilt: false,
  wormholeDebugRandomCamTiltAmount: 1,
  wormholeDebugCircularCamTilt: false,
  wormholeDebugHeroFocalSync: true,
  wormholeDebugCoinSizeOverride: true,
  wormholeDebugCoinSizeDesktopPct: HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
  wormholeDebugCoinSizeMobilePct: HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
  wormholeDebugCoinSizeRevision: 0,
  wormholeJourneyMouseParallax: 'off',
  wormholeBlackHoleOverlayEnabled: false,
  wormholeCoinClickTunnelBoost: false,
  wormholeCoinFadeOnScrollForward: true,
  wormholeAtmospherePreset: 'nebula',
  wormholeCosmicOverlayEnabled: false,
  wormholeHelixJuliaRibbonShaderEnabled: true,
  wormholeHelixTubeVariant: 0,
  wormholeHelixTubeJuliaPatternEnabled: true,
  wormholeHelixJuliaPatternBloomMul: 1,
  wormholeHelixJuliaInteriorBlur: 0,
  wormholeHelixJuliaShimmer: 0,
  wormhole5CoinDriftMoteFaceReflectionEnabled: false,
  wormhole5CoinDriftMoteLiveParticleReflectionEnabled: false,
  wormhole5CoinCinematicSpinLightingEnabled: false,
  wormhole5CoinHelixReflectionEnabled: false,
  wormholeDebugJuliaAmbientSync: false,
  wormholeDebugJuliaAmbientSyncRate: 1,
  wormholeDebugJuliaAmbientEqualizer: false,
  wormholeDebugJuliaAmbientEqualizerStrength: 1,
  wormholeTunnelQualityPreset: 'auto',
  wormholeTunnelRingSegsInversion: 256,
  wormholeTunnelRingSegsClassic: 192,
  wormholeTunnelStarCount: 2200,
  wormholeTunnelSkySegW: 64,
  wormholeTunnelSkySegH: 40,
  wormholeTunnelParticleCap: 4000,
  wormholeTunnelMoteSpriteSize: 128,
  wormholeTunnelQualityRevision: 0,
  wormholeDebugDriftMotesIdleBuzz: false,
  wormholeHelixQualityPreset: 'auto',
  wormholeHelixPathPts: 900,
  wormholeHelixTubeRadialSegs: 8,
  wormholeHelixTubeRadius: 0.2,
  wormholeHelixTwistTurns: 3.1,
  wormholeHelixRadialScale: 0.96,
  wormholeHelixWobbleAmp: 0.58,
  wormholeHelixWobbleFreq: 9.5,
  wormholeHelixOpacity: 0.78,
  wormholeHelixMobileBloomMul: 0.75,
  wormholeHelixQualityRevision: 0,
  wormholeCoinFollowCamEnabled: false,
  wormholeCoinFollowCamStrength: 1,
  ...wormholeCoinScrollCameraStorePatch(),
  wormholeCoinScrollCamRevision: 0,
  wormholeCoinGunmetalRimSweepLightsEnabled: true,
  wormholeCoinGunmetalRimEdgeGrazeLightsEnabled: true,
  wormholeCoinGunmetalRimTangentRingLightsEnabled: true,
  wormholeCoinGunmetalRimUvMotionEnabled: true,
  wormholeCoinGunmetalRimEmissiveShimmerEnabled: true,
  wormholeCoinBackdropFaceLightEnabled: false,
  wormhole8HelixBoostEnabled: true,
  wormholeIntroDepthOverride: null,
  wormholeHomeIntroCam01: 1,
  wormholeTunnelRenderPaused: false,
  cosmicJuliaBlend: 0.7,
  cosmicCloudDensity: 1.0,
  cosmicCoreIntensity: 1.2,
  cosmicJuliaZoom: 1.6,
};

let state: TunnelState = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const tunnelStore = {
  getState(): TunnelState {
    return state;
  },
  setState(partial: Partial<TunnelState>) {
    state = { ...state, ...partial };
    emit();
  },
  reset() {
    state = { ...initial };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
