'use client';

import type { CSSProperties } from 'react';
import { useSyncExternalStore } from 'react';

import {
  getHeroCoinDebugLogoSizeStyleSnapshot,
  getHeroCoinDebugLogoSizeStyleServerSnapshot,
  subscribeHeroCoinDebugLogoSize,
} from '@/lib/heroCoinDebugSize';

/**
 * Inline `--hero-logo-size` on `.wormhole-hero-coin-anchor` — wins over stylesheet `min()` / diameter
 * so tunnel debug % sliders apply on first paint (no toggle needed after refresh).
 */
export function useHeroCoinDebugLogoSizeStyle(): CSSProperties {
  return useSyncExternalStore(
    subscribeHeroCoinDebugLogoSize,
    getHeroCoinDebugLogoSizeStyleSnapshot,
    getHeroCoinDebugLogoSizeStyleServerSnapshot,
  );
}
