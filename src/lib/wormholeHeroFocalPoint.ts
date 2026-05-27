/**
 * Shared hero focal point + optional coin diameter — see `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md`.
 * CSS on `.wormhole5-route` reads `--hero-focal-*-frac` (and optional `--hero-coin-diameter`).
 */

import {
  getGalaxyFoldViewportClass,
  subscribeGalaxyFoldViewportClass,
} from '@/lib/galaxyFoldViewport';
import {
  HERO_COIN_DIAMETER,
  HERO_FOCAL_POINT,
} from '@/lib/wormholePageConfig';
import type { HeroFocalPoint } from '@/lib/wormholeHeroFocalCamera';

export type { HeroFocalPoint };

export type HeroFocalCssVars = {
  '--hero-focal-x-frac': string;
  '--hero-focal-y-frac': string;
  '--hero-coin-diameter'?: string;
};

export type HeroFocalResolved = {
  focal: HeroFocalPoint;
  /** When set, overrides default lab logo sizing for edge viewports. */
  diameter: string | null;
};

const DESKTOP_LARGE_MIN_W = 1440;
const MOBILE_PORTRAIT_MAX_W = 480;
const SHORT_LANDSCAPE_MAX_H = 500;

const SSR_RESOLVED: HeroFocalResolved = {
  focal: HERO_FOCAL_POINT.portrait,
  diameter: null,
};

const SSR_SNAPSHOT: HeroFocalCssVars = {
  '--hero-focal-x-frac': '0.5',
  '--hero-focal-y-frac': '0.52',
};

let cachedKey = '';
let cachedResolved: HeroFocalResolved = SSR_RESOLVED;
let cachedSnapshot: HeroFocalCssVars = SSR_SNAPSHOT;

function viewportCacheKey(): string {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return `${w}|${h}|${getGalaxyFoldViewportClass()}|${w > h ? 'L' : 'P'}`;
}

export function resolveHeroFocalForViewport(): HeroFocalResolved {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h;
  const foldClass = getGalaxyFoldViewportClass();

  let focal: HeroFocalPoint = HERO_FOCAL_POINT.portrait;
  let diameter: string | null = null;

  if (w >= DESKTOP_LARGE_MIN_W) {
    focal = HERO_FOCAL_POINT.desktopLarge;
  } else if (foldClass === 'folded') {
    diameter = HERO_COIN_DIAMETER.foldFolded;
  } else if (foldClass === 'unfolded') {
    focal = HERO_FOCAL_POINT.foldUnfolded;
    diameter = HERO_COIN_DIAMETER.foldUnfolded;
  } else if (landscape && h < SHORT_LANDSCAPE_MAX_H) {
    focal = HERO_FOCAL_POINT.landscape;
    diameter = HERO_COIN_DIAMETER.landscapeShort;
  }

  return { focal, diameter };
}

function toCssVars(resolved: HeroFocalResolved): HeroFocalCssVars {
  const vars: HeroFocalCssVars = {
    '--hero-focal-x-frac': String(resolved.focal.x),
    '--hero-focal-y-frac': String(resolved.focal.y),
  };
  if (resolved.diameter) {
    vars['--hero-coin-diameter'] = resolved.diameter;
  }
  return vars;
}

/** Stable snapshot for `useSyncExternalStore` — must not return a new object every read. */
export function getHeroFocalPointSnapshot(): HeroFocalResolved {
  if (typeof window === 'undefined') return SSR_RESOLVED;

  const key = viewportCacheKey();
  if (key === cachedKey) return cachedResolved;

  cachedKey = key;
  cachedResolved = resolveHeroFocalForViewport();
  cachedSnapshot = toCssVars(cachedResolved);
  return cachedResolved;
}

export function getHeroFocalCssVarsSnapshot(): HeroFocalCssVars {
  if (typeof window === 'undefined') return SSR_SNAPSHOT;
  getHeroFocalPointSnapshot();
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
    cachedKey = '';
    listener();
  };
  const orientationMq = window.matchMedia('(orientation: landscape)');
  const unsubFold = subscribeGalaxyFoldViewportClass(onChange);

  orientationMq.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);

  return () => {
    unsubFold();
    orientationMq.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}
