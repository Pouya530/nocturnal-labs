'use client';

import { useSyncExternalStore } from 'react';

import {
  getHeroFocalCssVarsServerSnapshot,
  getHeroFocalCssVarsSnapshot,
  subscribeHeroFocalCssVars,
  type HeroFocalCssVars,
  type HeroFocalProfile,
} from '@/lib/wormholeHeroFocalPoint';
import { getGalaxyFoldViewportClass, subscribeGalaxyFoldViewportClass } from '@/lib/galaxyFoldViewport';

function subscribeHeroFocal(onStoreChange: () => void): () => void {
  return subscribeHeroFocalCssVars(onStoreChange);
}

export function useWormholeHeroFocalPoint(
  enabled: boolean,
  profile: HeroFocalProfile = 'home',
): HeroFocalCssVars {
  return useSyncExternalStore(
    subscribeHeroFocal,
    () => (enabled ? getHeroFocalCssVarsSnapshot(profile) : getHeroFocalCssVarsServerSnapshot()),
    getHeroFocalCssVarsServerSnapshot,
  );
}

export function useGalaxyFoldViewportClass(): string {
  return useSyncExternalStore(
    subscribeGalaxyFoldViewportClass,
    () => getGalaxyFoldViewportClass(),
    () => 'standard',
  );
}
