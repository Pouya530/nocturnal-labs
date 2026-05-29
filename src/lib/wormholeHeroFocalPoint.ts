/**
 * Shared hero focal point + optional coin diameter — see `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md`.
 * CSS on `.wormhole5-route` reads `--hero-focal-*-frac` (and optional `--hero-coin-diameter`).
 */

import { getHeroCoinDebugCssOverride } from '@/lib/heroCoinDebugSize';
import {
  getGalaxyFoldViewportClass,
  subscribeGalaxyFoldViewportClass,
} from '@/lib/galaxyFoldViewport';
import { tunnelStore } from '@/tunnel/tunnelStore';
import {
  HERO_COIN_SIZE_DESKTOP,
  HERO_COIN_DIAMETER,
  HERO_COIN_SIZE_MOBILE_PORTRAIT,
  HERO_FOCAL_POINT,
  HERO_FOCAL_POINT_WORMHOLE5_LAB,
} from '@/lib/wormholePageConfig';
import type { HeroFocalPoint, HeroFocalProfile } from '@/lib/wormholeHeroFocalCamera';

export type { HeroFocalPoint, HeroFocalProfile };

export type HeroFocalCssVars = {
  '--hero-focal-x-frac': string;
  '--hero-focal-y-frac': string;
  '--hero-coin-diameter'?: string;
  /** Tunnel debug — overrides `--hero-logo-size` when set (see `globals.css`). */
  '--hero-coin-debug-size'?: string;
  '--hero-logo-size'?: string;
};

export type HeroFocalResolved = {
  focal: HeroFocalPoint;
  /** When set, overrides default lab logo sizing for edge viewports. */
  diameter: string | null;
};

const DESKTOP_LARGE_MIN_W = 1440;
const DESKTOP_MIN_W = 1024;
const SHORT_LANDSCAPE_MAX_H = 500;

let heroFocalProfile: HeroFocalProfile = 'home';
const profileListeners = new Set<() => void>();

/** Lab `/wormhole5` vs production home — invalidates focal cache on change. */
export function setHeroFocalProfile(profile: HeroFocalProfile): void {
  if (heroFocalProfile === profile) return;
  heroFocalProfile = profile;
  cachedKey = '';
  profileListeners.forEach((l) => l());
}

function inferHeroFocalProfileFromPath(): HeroFocalProfile {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (
    p === '/wormhole5' ||
    p === '/wormhole5/' ||
    p === '/wormhole20' ||
    p === '/wormhole20/'
  ) {
    return 'wormhole5Lab';
  }
  return 'home';
}

/** Shell override, else pathname inference (backdrop before layout effect on `/wormhole5`). */
export function getHeroFocalProfile(): HeroFocalProfile {
  if (heroFocalProfile === 'wormhole5Lab') return 'wormhole5Lab';
  const inferred = inferHeroFocalProfileFromPath();
  if (inferred === 'wormhole5Lab') return 'wormhole5Lab';
  return heroFocalProfile;
}

/** Lab focal table + camera Y mul — `/wormhole5` lab route only (home `/` stays on {@link HERO_FOCAL_POINT}). */
export function usesWormhole5LabFocalTable(profile: HeroFocalProfile = getHeroFocalProfile()): boolean {
  return profile === 'wormhole5Lab';
}

export function getEffectiveHeroFocalProfile(
  profile: HeroFocalProfile = getHeroFocalProfile(),
): HeroFocalProfile {
  return usesWormhole5LabFocalTable(profile) ? 'wormhole5Lab' : 'home';
}

/** Production `/`, `/wormhole5`, `/wormhole20` — tunnel lookAt always tracks hero focal (not optional). */
export function isWormholeHeroFocalSyncRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '/' || p === '/wormhole5' || p === '/wormhole20';
}

/** Tunnel camera mouth aim — debug flag or always on hero focal routes. */
export function shouldApplyHeroFocalTunnelSync(debugSyncEnabled: boolean): boolean {
  return debugSyncEnabled || isWormholeHeroFocalSyncRoute();
}

const SSR_RESOLVED: HeroFocalResolved = {
  focal: HERO_FOCAL_POINT.portrait,
  diameter: null,
};

const SSR_SNAPSHOT: HeroFocalCssVars = {
  '--hero-focal-x-frac': '0.5',
  '--hero-focal-y-frac': '0.5',
};

let cachedKey = '';
let cachedResolved: HeroFocalResolved = SSR_RESOLVED;
let cachedSnapshot: HeroFocalCssVars = SSR_SNAPSHOT;

function viewportCacheKey(profile: HeroFocalProfile): string {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const s = tunnelStore.getState();
  const debugKey = s.wormholeDebugCoinSizeOverride
    ? `|dbg:${s.wormholeDebugCoinSizeDesktopPct}:${s.wormholeDebugCoinSizeMobilePct}:r${s.wormholeDebugCoinSizeRevision}`
    : '';
  return `${profile}|${w}|${h}|${getGalaxyFoldViewportClass()}|${w > h ? 'L' : 'P'}${debugKey}`;
}

/** Clears focal CSS cache (tunnel debug coin size, resize, profile change). */
export function invalidateHeroFocalCssCache(): void {
  cachedKey = '';
}

let heroCoinDebugWarmDone = false;

/** First client layout — refresh focal cache once (do not bump revision; that loops subscribers). */
export function warmHeroCoinDebugSizeOnClientMount(): void {
  if (typeof window === 'undefined' || heroCoinDebugWarmDone) return;
  heroCoinDebugWarmDone = true;
  if (!tunnelStore.getState().wormholeDebugCoinSizeOverride) return;
  invalidateHeroFocalCssCache();
}

export function resolveHeroFocalForViewport(
  profile: HeroFocalProfile = heroFocalProfile,
): HeroFocalResolved {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h;
  const foldClass = getGalaxyFoldViewportClass();
  const effective = getEffectiveHeroFocalProfile(profile);
  const points = effective === 'wormhole5Lab' ? HERO_FOCAL_POINT_WORMHOLE5_LAB : HERO_FOCAL_POINT;

  let focal: HeroFocalPoint = points.portrait;
  let diameter: string | null = null;

  if (w >= DESKTOP_LARGE_MIN_W) {
    focal = points.desktopLarge;
  } else if (
    effective === 'wormhole5Lab' &&
    w >= DESKTOP_MIN_W &&
    foldClass === 'standard' &&
    !(landscape && h < SHORT_LANDSCAPE_MAX_H)
  ) {
    focal = HERO_FOCAL_POINT_WORMHOLE5_LAB.desktop;
  } else if (foldClass === 'folded') {
    diameter = HERO_COIN_DIAMETER.foldFolded;
  } else if (foldClass === 'unfolded') {
    focal = points.foldUnfolded;
    diameter = HERO_COIN_DIAMETER.foldUnfolded;
  } else if (landscape && h < SHORT_LANDSCAPE_MAX_H) {
    focal = points.landscape;
    diameter = HERO_COIN_DIAMETER.landscapeShort;
  } else if (w >= DESKTOP_MIN_W) {
    diameter = HERO_COIN_SIZE_DESKTOP;
  } else if (!landscape) {
    diameter = HERO_COIN_SIZE_MOBILE_PORTRAIT;
  }

  return { focal, diameter };
}

function toCssVars(resolved: HeroFocalResolved): HeroFocalCssVars {
  const vars: HeroFocalCssVars = {
    '--hero-focal-x-frac': String(resolved.focal.x),
    '--hero-focal-y-frac': String(resolved.focal.y),
  };
  const debugOverride = tunnelStore.getState().wormholeDebugCoinSizeOverride;
  if (resolved.diameter && !debugOverride) {
    vars['--hero-coin-diameter'] = resolved.diameter;
  }
  const debugSize = getHeroCoinDebugCssOverride();
  if (debugSize) {
    vars['--hero-coin-debug-size'] = debugSize;
    vars['--hero-logo-size'] = debugSize;
  }
  return vars;
}

/** Stable snapshot for `useSyncExternalStore` — must not return a new object every read. */
export function getHeroFocalPointSnapshot(
  profile: HeroFocalProfile = getHeroFocalProfile(),
): HeroFocalResolved {
  if (typeof window === 'undefined') return SSR_RESOLVED;

  const effective = getEffectiveHeroFocalProfile(profile);
  const key = viewportCacheKey(effective);
  if (key === cachedKey) return cachedResolved;

  cachedKey = key;
  cachedResolved = resolveHeroFocalForViewport(profile);
  cachedSnapshot = toCssVars(cachedResolved);
  return cachedResolved;
}

export function getHeroFocalCssVarsSnapshot(
  profile: HeroFocalProfile = getHeroFocalProfile(),
): HeroFocalCssVars {
  if (typeof window === 'undefined') return SSR_SNAPSHOT;
  getHeroFocalPointSnapshot(profile);
  return cachedSnapshot;
}

export function getHeroFocalCssVarsServerSnapshot(): HeroFocalCssVars {
  return SSR_SNAPSHOT;
}

/** @deprecated Use {@link getHeroFocalCssVarsSnapshot} */
export function resolveHeroFocalCssVars(): HeroFocalCssVars {
  return getHeroFocalCssVarsSnapshot();
}

export function subscribeHeroFocalCssVars(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onChange = () => {
    invalidateHeroFocalCssCache();
    listener();
  };
  const orientationMq = window.matchMedia('(orientation: landscape)');
  const unsubFold = subscribeGalaxyFoldViewportClass(onChange);
  const unsubTunnel = tunnelStore.subscribe(onChange);
  profileListeners.add(onChange);

  orientationMq.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);

  return () => {
    profileListeners.delete(onChange);
    unsubFold();
    unsubTunnel();
    orientationMq.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}
