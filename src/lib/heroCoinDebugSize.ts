/**
 * Tunnel debug — live coin size preview as % of {@link HERO_COIN_BASELINE_DESKTOP_PX} /
 * {@link HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX} via `--hero-coin-debug-size` on `.wormhole5-route`.
 */

import type { CSSProperties } from 'react';

import { getGalaxyFoldViewportClass } from '@/lib/galaxyFoldViewport';
import {
  HERO_COIN_BASELINE_DESKTOP_PX,
  HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
  HERO_COIN_MOBILE_PORTRAIT_SCALE,
} from '@/lib/wormholePageConfig';
import { tunnelStore } from '@/tunnel/tunnelStore';

const LOGO_SIZE_STYLE_EMPTY = {} as CSSProperties;
let cachedLogoSizeStylePx = '';
let cachedLogoSizeStyle: CSSProperties = LOGO_SIZE_STYLE_EMPTY;

export const HERO_COIN_DEBUG_SIZE_STORAGE_KEY = 'nl-wormhole-coin-debug-size';

const DESKTOP_MIN_W = 1024;
const SHORT_LANDSCAPE_MAX_H = 500;

export type HeroCoinDebugViewportKind = 'desktop' | 'mobilePortrait' | 'other';

export function heroCoinDebugViewportKind(): HeroCoinDebugViewportKind {
  if (typeof window === 'undefined') return 'other';
  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h;
  const foldClass = getGalaxyFoldViewportClass();

  if (
    w >= DESKTOP_MIN_W &&
    foldClass === 'standard' &&
    !(landscape && h < SHORT_LANDSCAPE_MAX_H)
  ) {
    return 'desktop';
  }

  if (!landscape && w < DESKTOP_MIN_W) {
    return 'mobilePortrait';
  }

  return 'other';
}

export function heroCoinPxFromBaselinePct(baselinePx: number, pct: number): number {
  return Math.max(48, Math.round((baselinePx * pct) / 100));
}

export function heroCoinEffectiveDiameterPx(basePx: number, scale = 1): number {
  return Math.round(basePx * scale);
}

/** When debug override is on, returns e.g. `350px` for the active viewport bucket. */
export function getHeroCoinDebugCssOverride(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const s = tunnelStore.getState();
  if (!s.wormholeDebugCoinSizeOverride) return undefined;

  const kind = heroCoinDebugViewportKind();
  if (kind === 'desktop') {
    return `${heroCoinPxFromBaselinePct(HERO_COIN_BASELINE_DESKTOP_PX, s.wormholeDebugCoinSizeDesktopPct)}px`;
  }
  if (kind === 'mobilePortrait') {
    return `${heroCoinPxFromBaselinePct(HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX, s.wormholeDebugCoinSizeMobilePct)}px`;
  }
  return undefined;
}

export function readStoredHeroCoinDebugSize(): Partial<{
  wormholeDebugCoinSizeOverride: boolean;
  wormholeDebugCoinSizeDesktopPct: number;
  wormholeDebugCoinSizeMobilePct: number;
}> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HERO_COIN_DEBUG_SIZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      override?: boolean;
      desktopPct?: number;
      mobilePct?: number;
    };
    const partial: Partial<{
      wormholeDebugCoinSizeOverride: boolean;
      wormholeDebugCoinSizeDesktopPct: number;
      wormholeDebugCoinSizeMobilePct: number;
    }> = {};
    /* Override defaults to on in tunnelStore; do not restore from storage. */
    if (Number.isFinite(parsed.desktopPct)) {
      partial.wormholeDebugCoinSizeDesktopPct = clampPct(parsed.desktopPct as number);
    }
    if (Number.isFinite(parsed.mobilePct)) {
      partial.wormholeDebugCoinSizeMobilePct = clampPct(parsed.mobilePct as number);
    }
    return partial;
  } catch {
    return {};
  }
}

export function bumpHeroCoinDebugSizeRevision(): void {
  const rev = tunnelStore.getState().wormholeDebugCoinSizeRevision;
  tunnelStore.setState({ wormholeDebugCoinSizeRevision: rev + 1 });
}

/** Stable snapshot for `useHeroCoinDebugLogoSizeStyle` (must not allocate every read). */
export function getHeroCoinDebugLogoSizeStyleSnapshot(): CSSProperties {
  const px = getHeroCoinDebugCssOverride();
  if (!px) {
    cachedLogoSizeStylePx = '';
    cachedLogoSizeStyle = LOGO_SIZE_STYLE_EMPTY;
    return LOGO_SIZE_STYLE_EMPTY;
  }
  if (px === cachedLogoSizeStylePx) return cachedLogoSizeStyle;
  cachedLogoSizeStylePx = px;
  cachedLogoSizeStyle = {
    '--hero-logo-size': px,
    '--hero-coin-debug-size': px,
  } as CSSProperties;
  return cachedLogoSizeStyle;
}

export function getHeroCoinDebugLogoSizeStyleServerSnapshot(): CSSProperties {
  return LOGO_SIZE_STYLE_EMPTY;
}

export function subscribeHeroCoinDebugLogoSize(listener: () => void): () => void {
  const onChange = () => {
    cachedLogoSizeStylePx = '';
    listener();
  };
  const unsubTunnel = tunnelStore.subscribe(onChange);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onChange);
  }
  return () => {
    unsubTunnel();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onChange);
    }
  };
}

export function persistHeroCoinDebugSize(): void {
  if (typeof window === 'undefined') return;
  const s = tunnelStore.getState();
  try {
    localStorage.setItem(
      HERO_COIN_DEBUG_SIZE_STORAGE_KEY,
      JSON.stringify({
        override: s.wormholeDebugCoinSizeOverride,
        desktopPct: s.wormholeDebugCoinSizeDesktopPct,
        mobilePct: s.wormholeDebugCoinSizeMobilePct,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function clampPct(n: number): number {
  return Math.min(200, Math.max(50, Math.round(n)));
}

export {
  HERO_COIN_BASELINE_DESKTOP_PX,
  HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
  HERO_COIN_MOBILE_PORTRAIT_SCALE,
};
