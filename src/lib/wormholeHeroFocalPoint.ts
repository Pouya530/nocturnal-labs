/**
 * Shared hero focal point + coin diameter — see `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md`.
 * CSS on `.wormhole5-home-route` reads `--hero-focal-*-frac` and `--hero-coin-diameter`.
 */

import {
  getGalaxyFoldViewportClass,
  subscribeGalaxyFoldViewportClass,
} from '@/lib/galaxyFoldViewport';
import {
  HERO_COIN_DIAMETER,
  HERO_FOCAL_POINT,
} from '@/lib/wormholePageConfig';

export type HeroFocalCssVars = {
  '--hero-focal-x-frac': string;
  '--hero-focal-y-frac': string;
  '--hero-coin-diameter': string;
};

const DESKTOP_LARGE_MIN_W = 1440;
const MOBILE_PORTRAIT_MAX_W = 480;
const SHORT_LANDSCAPE_MAX_H = 500;

export function resolveHeroFocalCssVars(): HeroFocalCssVars {
  if (typeof window === 'undefined') {
    return {
      '--hero-focal-x-frac': String(HERO_FOCAL_POINT.portrait.x),
      '--hero-focal-y-frac': String(HERO_FOCAL_POINT.portrait.y),
      '--hero-coin-diameter': HERO_COIN_DIAMETER.default,
    };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h;
  const foldClass = getGalaxyFoldViewportClass();

  let focal: { x: number; y: number } = HERO_FOCAL_POINT.portrait;
  let diameter: string = HERO_COIN_DIAMETER.default;

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
  } else if (!landscape && w < MOBILE_PORTRAIT_MAX_W) {
    diameter = HERO_COIN_DIAMETER.mobilePortrait;
  }

  return {
    '--hero-focal-x-frac': String(focal.x),
    '--hero-focal-y-frac': String(focal.y),
    '--hero-coin-diameter': diameter,
  };
}

export function subscribeHeroFocalCssVars(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onChange = () => listener();
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
