/**
 * Tunable tunnel + scroll defaults for wormhole lab routes (`/wormhole`, `/wormhole3`).
 * Shells apply these via `tunnelStore` on mount and restore previous values on unmount.
 */
export const WORMHOLE_CLASSIC_TUNNEL = {
  ringCount: 176,
  ringSpacing: 4,
  maxDepth: 24_000,
  /** Default wheel / touch sign (+1). */
  scrollImpulseSign: 1 as const,
} as const;

/** `/wormhole4` — initial depth/velocity for journey camera; scroll direction matches {@link WORMHOLE_CLASSIC_TUNNEL}. */
export const WORMHOLE4_TUNNEL_START = {
  depth: 205.87,
  velocity: -0.02,
} as const;

/** `/wormhole5`+ — locked mouth: no depth drift until scroll. */
export const WORMHOLE5_TUNNEL_START = {
  depth: 0,
  velocity: 0,
} as const;

/**
 * `/wormhole5` / localhost `/` — after {@link SitePreloader} dismisses: tunnel starts at this depth (vel 0),
 * eases back to mouth (`0`), then coin + journey camera ramp (parallel with pullback unless reduced motion).
 * Kept at +25% vs legacy 26.25 together with {@link WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP} /
 * {@link WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH}.
 */
export const WORMHOLE5_INTRO_DEPTH_START = 32.8125;

/** Duration (ms) for home intro depth sweep into mouth (production; see {@link wormholeHomeIntroDepthPullbackMs}). */
export const WORMHOLE5_INTRO_DEPTH_PULLBACK_MS = 3600;

/** Desktop/laptop depth pullback (`/wormhole6`); matches localhost:3001 dev. */
export const WORMHOLE_HOME_INTRO_DEPTH_PULLBACK_MS_DEV_DESKTOP = 10_000;

/** Post-preloader depth pullback duration (desktop: 10s like dev; touch: {@link WORMHOLE5_INTRO_DEPTH_PULLBACK_MS}). */
export function wormholeHomeIntroDepthPullbackMs(touchPrimary: boolean): number {
  if (!touchPrimary) {
    return WORMHOLE_HOME_INTRO_DEPTH_PULLBACK_MS_DEV_DESKTOP;
  }
  return WORMHOLE5_INTRO_DEPTH_PULLBACK_MS;
}

/**
 * `/wormhole5` — coin + journey camera ramp (runs in parallel with pullback; tuned with {@link WORMHOLE_HOME_MICRO_INTRO_MS}).
 */
export const WORMHOLE5_COIN_MICRO_INTRO_MS = 820;

/** Linear intro progress (0–1) before the coin opacity eases in — wormhole5 only. */
export const WORMHOLE5_COIN_MICRO_INTRO_LOGO_DELAY = 0.06;

/** Hero logo `translateZ` start (px): coin reads deeper “in the tunnel”, eases to `0` with the intro. */
export const WORMHOLE5_INTRO_LOGO_START_TZ_PX = -132;

/** `/wormhole9` — same mouth lock as wormhole5 (homepage candidate preview). */
export const WORMHOLE9_TUNNEL_START = WORMHOLE5_TUNNEL_START;

/** `/wormhole10` — wormhole5 mouth lock + volumetric cosmic layer behind the Julia tunnel. */
export const WORMHOLE10_TUNNEL_START = WORMHOLE5_TUNNEL_START;

/** `/wormhole11` — same mouth / mobile start as wormhole9 (cosmic + wormhole5 GL + intro cam ramp). */
export const WORMHOLE11_TUNNEL_START = WORMHOLE9_TUNNEL_START;

/** `/wormhole20` — same mouth lock / intro as {@link WORMHOLE5_TUNNEL_START} (dev lab on localhost:3001). */
export const WORMHOLE20_TUNNEL_START = WORMHOLE5_TUNNEL_START;

/** Production `/` — touch-primary: start further into the tube; vel 0. */
export const WORMHOLE6_MOBILE_TUNNEL_START = {
  depth: 122.76,
  velocity: 0,
} as const;

/**
 * Production `/` desktop (`Wormhole6ClientShell`) — post-preloader tunnel depth before pullback to mouth (`0`).
 */
export const WORMHOLE_HOME_INTRO_DEPTH_DELTA_DESKTOP = 4000;

/**
 * Production `/` touch-first — sweep on top of {@link WORMHOLE6_MOBILE_TUNNEL_START}.depth (+25% vs legacy 112).
 */
export const WORMHOLE_HOME_INTRO_DEPTH_DELTA_TOUCH = 140;

/** Ms after preloader before coin fade/zoom (`0` = parallel with tunnel, matches localhost:3001). */
export const WORMHOLE_HOME_MICRO_INTRO_DELAY_MS = 0;

/** Fraction of pullback time that covers {@link WORMHOLE_HOME_INTRO_DEPTH_FAST_DISTANCE_FRAC} of depth travel. */
export const WORMHOLE_HOME_INTRO_DEPTH_FAST_TIME_FRAC = 0.52;

/** Depth eased progress reached by end of the fast leg (see {@link wormholeHomeIntroDepthEased}). */
export const WORMHOLE_HOME_INTRO_DEPTH_FAST_DISTANCE_FRAC = 0.84;

/** Journey cam (`wormholeHomeIntroCam01`) reaches `1` when depth eased progress hits this (0–1). */
export const WORMHOLE_HOME_INTRO_CAM_AT_DEPTH_EASED = 0.36;

/**
 * Hero coin fade + scale after preloader (matches localhost:3001 — parallel with tunnel on `/`).
 */
export const WORMHOLE_HOME_MICRO_INTRO_MS = 4000;

/** @deprecated Use {@link WORMHOLE_HOME_MICRO_INTRO_DELAY_MS}. */
export const WORMHOLE_HOME_MICRO_INTRO_DELAY_MS_DEV = WORMHOLE_HOME_MICRO_INTRO_DELAY_MS;

/** @deprecated Use {@link WORMHOLE_HOME_MICRO_INTRO_MS}. */
export const WORMHOLE_HOME_MICRO_INTRO_MS_DEV = WORMHOLE_HOME_MICRO_INTRO_MS;

/** Stage-reveal + coin GL intro duration (ms) for home / wormhole hero stacks. */
export function wormholeHomeMicroIntroMs(): number {
  return WORMHOLE_HOME_MICRO_INTRO_MS;
}

/** Ms to wait after preloader before coin fade/zoom begins. */
export function wormholeHomeMicroIntroDelayMs(): number {
  return WORMHOLE_HOME_MICRO_INTRO_DELAY_MS;
}

/** Legacy gate (0–1); stage-reveal opacity now tracks scale ease — kept for call-site compatibility. */
export const WORMHOLE_HOME_MICRO_INTRO_LOGO_DELAY = 0.14;

/** Opening hero scale multiplier before the intro grows to 1 (smaller = more dramatic arrival). */
export const WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE = 0.48;

/** Mobile portrait — 50% larger opening coin than {@link WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE}. */
export const WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE_MOBILE_PORTRAIT = 0.72;

/**
 * `/wormhole5` — opening journey zoom + logo timeline (much longer than {@link WORMHOLE_HOME_MICRO_INTRO_MS}).
 */
export const WORMHOLE5_OPENING_INTRO_MS = 3600;

/**
 * Camera reaches full pullback by this fraction of {@link WORMHOLE5_OPENING_INTRO_MS} — keeps the zoom
 * **fast** while the overall intro stays long (logo / settle).
 */
export const WORMHOLE5_OPENING_CAM_ZOOM_FRAC = 0.15;

/** `/wormhole5` — linear intro progress (0–1) before the coin fades in. */
export const WORMHOLE5_OPENING_LOGO_DELAY = 0.06;

/**
 * `/` lab helices when `helixLabFullscreen`: bundle radius vs nominal tunnel wall (`ringRadius ×
 * radialScale`). Prod home pairs this with {@link WORMHOLE_HOME_HELIX_RING_STACK_FILL_BOOST} because
 * inversion rings sit around the mouth (unlike ribbon-only `/wormhole2`) while the throat journey
 * camera runs wider than wormhole2’s fixed FOV.
 */
export const WORMHOLE_HOME_HELIX_FULLSCREEN_WALL_MUL = 2.06;

/**
 * Extra radius multiplier when home stacks `ringGrowthInversion` rings around the helix bundle
 * (`helixLabFullscreen`). Keeps ribbons visually as dominant as `/wormhole2` without changing rings.
 */
export const WORMHOLE_HOME_HELIX_RING_STACK_FILL_BOOST = 1.34;

/** `/wormhole4` — `tunnelStore.sensitivity` for wheel → depth (`useScrollDepth`). */
export const WORMHOLE4_SENSITIVITY = 0.014;

/**
 * Wormhole lab routes (`/wormhole`…): `LogoCoinCanvas` width/height as % of the logo stage —
 * bleed room for the iridescent halo outside the coin silhouette (not full footprint scale).
 * Reduced from 222% per `NOCTURNAL_LABS_COIN_DIAGNOSIS_AND_FIX.md` (~4× stack with depth slot).
 */
export const WORMHOLE_LAB_COIN_CANVAS_PERCENT = 130;

/**
 * `WormholeCoinDepthScale` layout slot vs `--hero-logo-size` — extra margin around the coin before
 * depth `scale()` so zoomed GL paint stays inside the transformed box.
 */
export const WORMHOLE_COIN_DEPTH_SLOT_MUL = 1.84;

/** Hero coin + tunnel mouth optical centre (fractions 0–1). See `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md`. */
export const HERO_FOCAL_POINT = {
  portrait: { x: 0.5, y: 0.5 },
  /** Short landscape phones (h < 500px) — slightly below center vs tunnel mouth. */
  landscape: { x: 0.5, y: 0.54 },
  foldUnfolded: { x: 0.5, y: 0.51 },
  desktopLarge: { x: 0.5, y: 0.51 },
} as const;

/**
 * `/wormhole5` lab — coordinates match HERO_FOCAL_POINT so the coin and tunnel mouth sit
 * in the same position as on `/`. Tunnel lookAt follows this focal on the wormhole5 route,
 * so moving these values moves both the coin AND the tunnel mouth together.
 */
export const HERO_FOCAL_POINT_WORMHOLE5_LAB = {
  portrait: { x: 0.5, y: 0.5 },
  landscape: { x: 0.5, y: 0.54 },
  foldUnfolded: { x: 0.5, y: 0.51 },
  desktop: { x: 0.5, y: 0.51 },
  desktopLarge: { x: 0.5, y: 0.51 },
} as const;

/**
 * Original hero coin baselines for debug % sliders (`DebugTunnelPanel` → `--hero-coin-debug-size`).
 * Desktop: CSS `--hero-logo-size` before scale. Mobile portrait: base before `--hero-logo-scale: 1.5`.
 */
export const HERO_COIN_BASELINE_DESKTOP_PX = 292;
export const HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX = 280;
export const HERO_COIN_MOBILE_PORTRAIT_SCALE = 1.5;

/** Shipped targets in `globals.css` (263px desktop, 252px mobile portrait base → ~378px rendered at 1.5×). */
export const HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP = 90;
export const HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE = 90;

/** Default desktop / tablet coin diameter on wormhole5 + home (matches lab). */
export const HERO_COIN_SIZE_DESKTOP = 'min(237px, calc(100vw - 3rem))';

/** Base touch-portrait coin before `--hero-logo-scale: 1.5` in CSS (~420px effective). */
export const HERO_COIN_SIZE_MOBILE_PORTRAIT = 'min(364px, calc(100vw - 2rem))';

/**
 * Optional diameter overrides (fold / short landscape). Default sizing follows `.hero-logo-size-var`
 * + `.wormhole5-hero-logo` + `--hero-logo-vh-cap` (same as `/wormhole5` lab).
 */
export const HERO_COIN_DIAMETER = {
  landscapeShort: 'clamp(140px, 34vmin, 320px)',
  foldFolded: 'clamp(120px, 46vmin, 200px)',
  foldUnfolded: 'clamp(220px, 40vmin, 360px)',
} as const;

/**
 * `/wormhole4` — Wormhole (3D) debug panel defaults on first paint (restored when leaving the route).
 * Matches lab snapshot: 3D on, helices off, bloom 0.35 / radius 1.5 / threshold 0.02, fog 0.018.
 */
/** Random scroll camera tilt — base half-ranges before {@link TunnelState.wormholeDebugRandomCamTiltAmount}. */
export const WORMHOLE_DEBUG_RANDOM_CAM_TILT_TX = 0.44;
export const WORMHOLE_DEBUG_RANDOM_CAM_TILT_TY = 0.38;

/** Tunnel debug slider default / max for random cam tilt amount. */
export const WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT = 1;
export const WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX = 2.5;

export const WORMHOLE4_DEBUG_START = {
  wormhole3dBackgroundEnabled: true,
  wormholeHelices3dEnabled: false,
  wormholeDebugRandomCamTilt: false,
  wormholeDebugCircularCamTilt: false,
  wormholeCoinVisible: true,
  wormholeBlackHoleOverlayEnabled: false,
  bloomStrength: 0.35,
  bloomRadius: 1.5,
  bloomThreshold: 0.02,
  fogDensity: 0.018,
} as const;

/** Production `/` + `/wormhole5` — scroll zoom gain and inner void (tunnel debug sliders). */
export const WORMHOLE_HOME_TUNNEL_VISUAL = {
  zoomRate: 1000,
  holeRadius: 0.55,
} as const;

/**
 * Production `/` on touch-primary — lighter helix Julia + bloom through the ring→helix hand-off
 * (see {@link JuliaWormholeBackdrop} intro ring fade + `exitB` journey phase).
 */
export const WORMHOLE_HOME_MOBILE_TUNNEL_PERF = {
  wormholeHelixJuliaPatternBloomMul: 1.15,
  wormholeHelixJuliaInteriorBlur: 0.28,
  wormholeHelixJuliaShimmer: 0.55,
  bloomStrength: 0.22,
  bloomRadius: 0.28,
} as const;

/** Generic tunnel store defaults (2D fractal / legacy routes). */
export const TUNNEL_STORE_DEFAULT_SCROLL = {
  zoomRate: 0.25,
  holeRadius: 0.28,
} as const;

/**
 * `/wormhole5` — same 3D debug tuning as wormhole4, but **helix ribbons on** (lab helices +
 * wormhole4 rings + journey camera stacked).
 */
export const WORMHOLE5_DEBUG_START = {
  ...WORMHOLE4_DEBUG_START,
  wormholeHelices3dEnabled: true,
  ...WORMHOLE_HOME_TUNNEL_VISUAL,
} as const;

/**
 * `/wormhole5` lab route — atmosphere, bloom, ambient↔Julia sync (applied after helix postfx in shell).
 */
export const WORMHOLE5_TUNNEL_LAB_DEFAULTS = {
  wormholeAtmospherePreset: 'glacier',
  bloomStrength: 0.3,
  wormholeDebugJuliaAmbientSync: true,
  wormholeDebugJuliaAmbientSyncRate: 10,
  wormholeCoinFollowCamEnabled: false,
  wormholeCoinFollowCamStrength: 1,
  /** Idle drift-mote XY buzz when scroll is fully idle (wormhole5 locked mouth). */
  wormholeDebugDriftMotesIdleBuzz: true,
  /** Hero coin ↔ tunnel lookAt (also forced on `/wormhole5` via `shouldApplyHeroFocalTunnelSync`). */
  wormholeDebugHeroFocalSync: true,
} as const;

/** Tunnel debug slider + localStorage clamp for {@link WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate}. */
export const WORMHOLE_JULIA_AMBIENT_SYNC_RATE_MAX = 10;

/** `/wormhole20` — wormhole5 ambient sync + Web Audio equalizer (dev preview). */
export const WORMHOLE20_TUNNEL_LAB_DEFAULTS = {
  ...WORMHOLE5_TUNNEL_LAB_DEFAULTS,
  wormholeDebugJuliaAmbientEqualizer: true,
  wormholeDebugJuliaAmbientEqualizerStrength: 1,
} as const;

/**
 * Wormhole5 shell — touch-primary phones / tablets: trim Julia iterations, helix Julia taps, and bloom
 * radius samples while staying close to lab colour motion ({@link WORMHOLE5_TUNNEL_LAB_DEFAULTS} idle buzz on).
 */
export const WORMHOLE5_COARSE_TOUCH_RENDER_TUNING = {
  iters: 152,
  wormholeHelixJuliaPatternBloomMul: 2.28,
  wormholeHelixJuliaInteriorBlur: 0.44,
  wormholeHelixJuliaShimmer: 0.74,
  bloomStrength: 0.275,
  bloomRadius: 0.345,
  fogDensity: 0.00365,
  wormholeDebugDriftMotesIdleBuzz: true,
} as const;

export {
  WORMHOLE_DESKTOP_PRODUCTION_DPR_FLOOR,
  WORMHOLE_DESKTOP_PRODUCTION_DPR_MAX,
} from '@/lib/wormholeDesktopDpr';

/** Inversion-stack ring tessellation when {@link wormholeDesktopProductionHighQuality}. */
export const WORMHOLE_DESKTOP_PROD_RING_SEGS_INVERSION = 192;

/** Classic / intro ring tessellation when {@link wormholeDesktopProductionHighQuality}. */
export const WORMHOLE_DESKTOP_PROD_RING_SEGS_CLASSIC = 144;

/** Inversion rings when {@link wormholeTunnelRingsMaxQuality} (helix / wormhole prod tier unchanged). */
export const WORMHOLE_TUNNEL_MAX_RING_SEGS_INVERSION = 256;

/** Classic + intro mouth rings when {@link wormholeTunnelRingsMaxQuality}. */
export const WORMHOLE_TUNNEL_MAX_RING_SEGS_CLASSIC = 192;

/** Background stars in the Julia tunnel (not helix geometry). */
export const WORMHOLE_TUNNEL_MAX_STAR_COUNT = 2200;

/** Sky sphere segments behind the ring stack. */
export const WORMHOLE_TUNNEL_MAX_SKY_SEGS = { w: 64, h: 40 } as const;

/** Drift motes along the tube (tunnel particles only). */
export const WORMHOLE_TUNNEL_MAX_PARTICLE_COUNT = 4000;

/** Lab helix tube radial segments when {@link wormholeDesktopProductionHighQuality}. */
export const WORMHOLE_DESKTOP_PROD_HELIX_TUBE_RADIAL_SEGS = 24;

/** Catmull-Rom samples along each helix strand (desktop prod). */
export const WORMHOLE_DESKTOP_PROD_HELIX_PATH_PTS = 1400;

/** Background star count (desktop prod). */
export const WORMHOLE_DESKTOP_PROD_STAR_COUNT = 2200;

/** Sky sphere width/height segments (desktop prod). */
export const WORMHOLE_DESKTOP_PROD_SKY_SEGS = { w: 64, h: 40 } as const;

/** ACES tone-map exposure on the wormhole renderer (desktop prod). */
export const WORMHOLE_DESKTOP_PROD_TONE_EXPOSURE = 1.1;

/**
 * Production desktop home — minimal bloom + low helix blur for crisp edges (mobile unchanged).
 * Applied in {@link Wormhole5ClientShell} / {@link Wormhole6ClientShell} when
 * {@link wormholeDesktopProductionHighQuality} is true.
 */
export const WORMHOLE_HOME_DESKTOP_PROD_TUNNEL = {
  bloomStrength: 0.18,
  bloomRadius: 0.22,
  bloomThreshold: 0.08,
  wormholeHelixJuliaInteriorBlur: 0.12,
  wormholeHelixJuliaShimmer: 0.85,
} as const;

/**
 * Matches tunnel store **initial** bloom/fog (`/wormhole2` never overrides these). Wormhole4 debug
 * uses lower bloom; wormhole5 reapplies this on top of {@link WORMHOLE5_DEBUG_START} so helix
 * ribbons keep the same UnrealBloom “flare” as wormhole2.
 */
export const WORMHOLE2_HELIX_LAB_POSTFX = {
  bloomStrength: 0.5,
  bloomRadius: 1.5,
  bloomThreshold: 0.02,
  fogDensity: 0.018,
} as const;

/** `/wormhole3` — longer tube, wide ring spacing, inverted scroll, throat layout (see `JuliaWormholeBackdrop` `tunnelMode="throat"`). */
export const WORMHOLE3_TUNNEL = {
  ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount + 100,
  ringSpacing: 18,
  maxDepth: 36_000,
  scrollImpulseSign: -1 as const,
} as const;
