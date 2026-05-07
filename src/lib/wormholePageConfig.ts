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

/** Production `/` — touch-primary: start further into the tube; vel 0. */
export const WORMHOLE6_MOBILE_TUNNEL_START = {
  depth: 122.76,
  velocity: 0,
} as const;

/**
 * Higher than default store friction (0.92) so touch scroll coasts longer — easier to keep moving on
 * phones (`useScrollDepth` uses `Math.pow(friction, dt * 8)`).
 */
export const WORMHOLE6_MOBILE_FRICTION = 0.965;

/** `/wormhole4` — `tunnelStore.sensitivity` for wheel → depth (`useScrollDepth`). */
export const WORMHOLE4_SENSITIVITY = 0.014;

/**
 * Wormhole lab routes (`/wormhole`…): `LogoCoinCanvas` width/height as % of the logo stage so
 * scroll-driven camera zoom / FOV does not clip the coin at the GL framebuffer edges.
 */
export const WORMHOLE_LAB_COIN_CANVAS_PERCENT = 168;

/**
 * `WormholeCoinDepthScale` layout slot vs `--hero-logo-size` — extra margin around the coin before
 * depth `scale()` so zoomed GL paint stays inside the transformed box.
 */
export const WORMHOLE_COIN_DEPTH_SLOT_MUL = 1.56;

/**
 * `/wormhole4` — Wormhole (3D) debug panel defaults on first paint (restored when leaving the route).
 * Matches lab snapshot: 3D on, helices off, bloom 0.35 / radius 1.5 / threshold 0.18, fog 0.018.
 */
export const WORMHOLE4_DEBUG_START = {
  wormhole3dBackgroundEnabled: true,
  wormholeHelices3dEnabled: false,
  wormholeDebugRandomCamTilt: false,
  wormholeCoinVisible: true,
  wormholeBlackHoleOverlayEnabled: false,
  wormholeCoinFogEnabled: false,
  bloomStrength: 0.35,
  bloomRadius: 1.5,
  bloomThreshold: 0.18,
  fogDensity: 0.018,
} as const;

/**
 * `/wormhole5` — same 3D debug tuning as wormhole4, but **helix ribbons on** (lab helices +
 * wormhole4 rings + journey camera stacked).
 */
export const WORMHOLE5_DEBUG_START = {
  ...WORMHOLE4_DEBUG_START,
  wormholeHelices3dEnabled: true,
} as const;

/**
 * Matches tunnel store **initial** bloom/fog (`/wormhole2` never overrides these). Wormhole4 debug
 * uses lower bloom; wormhole5 reapplies this on top of {@link WORMHOLE5_DEBUG_START} so helix
 * ribbons keep the same UnrealBloom “flare” as wormhole2.
 */
export const WORMHOLE2_HELIX_LAB_POSTFX = {
  bloomStrength: 0.65,
  bloomRadius: 1.5,
  bloomThreshold: 0.18,
  fogDensity: 0.018,
} as const;

/** `/wormhole3` — longer tube, wide ring spacing, inverted scroll, throat layout (see `JuliaWormholeBackdrop` `tunnelMode="throat"`). */
export const WORMHOLE3_TUNNEL = {
  ringCount: WORMHOLE_CLASSIC_TUNNEL.ringCount + 100,
  ringSpacing: 18,
  maxDepth: 36_000,
  scrollImpulseSign: -1 as const,
} as const;
