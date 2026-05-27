'use client';

import { useSyncExternalStore } from 'react';

import {
  resolveHeroFocalCssVars,
  subscribeHeroFocalCssVars,
  type HeroFocalCssVars,
} from '@/lib/wormholeHeroFocalPoint';
import { getGalaxyFoldViewportClass, subscribeGalaxyFoldViewportClass } from '@/lib/galaxyFoldViewport';

const EMPTY: HeroFocalCssVars = {
  '--hero-focal-x-frac': '0.5',
  '--hero-focal-y-frac': '0.48',
  '--hero-coin-diameter': 'clamp(180px, 38vmin, 520px)',
};

export function useWormholeHeroFocalPoint(enabled: boolean): HeroFocalCssVars {
  return useSyncExternalStore(
    (onStoreChange) => (enabled ? subscribeHeroFocalCssVars(onStoreChange) : () => {}),
    () => (enabled ? resolveHeroFocalCssVars() : EMPTY),
    () => EMPTY,
  );
}

export function useGalaxyFoldViewportClass(): string {
  return useSyncExternalStore(
    subscribeGalaxyFoldViewportClass,
    () => getGalaxyFoldViewportClass(),
    () => 'standard',
  );
}
