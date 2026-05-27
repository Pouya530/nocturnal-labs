'use client';

import { useSyncExternalStore } from 'react';

import {
  getHeroFocalCssVarsServerSnapshot,
  getHeroFocalCssVarsSnapshot,
  subscribeHeroFocalCssVars,
  type HeroFocalCssVars,
} from '@/lib/wormholeHeroFocalPoint';
import { getGalaxyFoldViewportClass, subscribeGalaxyFoldViewportClass } from '@/lib/galaxyFoldViewport';

function subscribeHeroFocal(onStoreChange: () => void): () => void {
  return subscribeHeroFocalCssVars(onStoreChange);
}

export function useWormholeHeroFocalPoint(enabled: boolean): HeroFocalCssVars {
  return useSyncExternalStore(
    subscribeHeroFocal,
    () => (enabled ? getHeroFocalCssVarsSnapshot() : getHeroFocalCssVarsServerSnapshot()),
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
