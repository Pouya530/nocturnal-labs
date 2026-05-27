/**
 * Tunnel + Julia **ring stack** quality only (segments, stars, sky, motes).
 * Does not change helix tube geometry or helix shaders.
 */

import { isGalaxyFoldInnerPortrait } from '@/lib/galaxyFoldViewport';
import {
  isCoarseOrTouchPrimaryViewport,
  isIOSLike,
  webglWormholeAntialias,
  webglWormholePixelRatio,
  wormholeNarrowViewport,
  wormholeTunnelRingsMaxQuality,
} from '@/lib/webglMobilePrefs';
import { WORMHOLE_TUNNEL_MAX_PARTICLE_COUNT, WORMHOLE_TUNNEL_MAX_STAR_COUNT } from '@/lib/wormholePageConfig';
import { tunnelStore, type TunnelState } from '@/tunnel/tunnelStore';

export type WormholeTunnelQualityPresetId =
  | 'auto'
  | 'max'
  | 'mobile'
  | 'mobile-narrow'
  | 'fold-inner'
  | 'low'
  | 'custom';

export type WormholeTunnelQualityPreset = {
  id: Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'>;
  label: string;
  ringSegsInversion: number;
  ringSegsClassic: number;
  starCount: number;
  skySegW: number;
  skySegH: number;
  particleCap: number;
  moteSpriteSize: 64 | 128;
};

export const WORMHOLE_TUNNEL_QUALITY_PRESETS: Record<
  Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'>,
  WormholeTunnelQualityPreset
> = {
  max: {
    id: 'max',
    label: 'Max (desktop fine pointer)',
    ringSegsInversion: 256,
    ringSegsClassic: 192,
    starCount: WORMHOLE_TUNNEL_MAX_STAR_COUNT,
    skySegW: 64,
    skySegH: 40,
    particleCap: WORMHOLE_TUNNEL_MAX_PARTICLE_COUNT,
    moteSpriteSize: 128,
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile / touch (coarse)',
    ringSegsInversion: 96,
    ringSegsClassic: 80,
    starCount: 1500,
    skySegW: 48,
    skySegH: 32,
    particleCap: 2400,
    moteSpriteSize: 64,
  },
  'mobile-narrow': {
    id: 'mobile-narrow',
    label: 'Mobile narrow (≤767px)',
    ringSegsInversion: 80,
    ringSegsClassic: 64,
    starCount: 1200,
    skySegW: 40,
    skySegH: 28,
    particleCap: 1800,
    moteSpriteSize: 64,
  },
  'fold-inner': {
    id: 'fold-inner',
    label: 'Fold inner portrait (840–980px)',
    ringSegsInversion: 96,
    ringSegsClassic: 80,
    starCount: 1500,
    skySegW: 48,
    skySegH: 32,
    particleCap: 2400,
    moteSpriteSize: 64,
  },
  low: {
    id: 'low',
    label: 'Low (perf test)',
    ringSegsInversion: 72,
    ringSegsClassic: 56,
    starCount: 900,
    skySegW: 32,
    skySegH: 24,
    particleCap: 1200,
    moteSpriteSize: 64,
  },
};

export type WormholeDeviceProfile = {
  label: string;
  coarseTouch: boolean;
  iosLike: boolean;
  narrowViewport: boolean;
  foldInnerPortrait: boolean;
  ringsMaxAuto: boolean;
  suggestedPreset: Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'>;
};

export function detectWormholeDeviceProfile(): WormholeDeviceProfile {
  const coarseTouch = isCoarseOrTouchPrimaryViewport();
  const iosLike = isIOSLike();
  const narrowViewport = wormholeNarrowViewport();
  const foldInnerPortrait = isGalaxyFoldInnerPortrait();
  const ringsMaxAuto = wormholeTunnelRingsMaxQuality();

  let suggestedPreset: Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'> = 'mobile';
  if (foldInnerPortrait) suggestedPreset = 'fold-inner';
  else if (narrowViewport) suggestedPreset = 'mobile-narrow';
  else if (ringsMaxAuto) suggestedPreset = 'max';
  else if (coarseTouch || iosLike) suggestedPreset = 'mobile';

  const parts: string[] = [];
  if (foldInnerPortrait) parts.push('Galaxy Fold inner portrait');
  else if (narrowViewport) parts.push('narrow ≤767px');
  if (coarseTouch) parts.push('coarse / touch');
  if (iosLike) parts.push('iOS-like WebGL');
  if (ringsMaxAuto) parts.push('rings max-auto');
  if (parts.length === 0) parts.push('desktop fine pointer');

  return {
    label: parts.join(' · '),
    coarseTouch,
    iosLike,
    narrowViewport,
    foldInnerPortrait,
    ringsMaxAuto,
    suggestedPreset,
  };
}

export type ResolvedWormholeTunnelQuality = WormholeTunnelQualityPreset & {
  presetId: WormholeTunnelQualityPresetId;
  device: WormholeDeviceProfile;
  /** Effective drift motes (`min(store.particleCount, particleCap)`). */
  particleCount: number;
  ringCount: number;
  ringSpacing: number;
  rendererDpr: number;
  rendererAntialias: boolean;
};

function presetForId(
  id: Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'>,
): WormholeTunnelQualityPreset {
  return WORMHOLE_TUNNEL_QUALITY_PRESETS[id];
}

function resolvePresetId(state: TunnelState): Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'> {
  if (state.wormholeTunnelQualityPreset !== 'auto' && state.wormholeTunnelQualityPreset !== 'custom') {
    return state.wormholeTunnelQualityPreset;
  }
  return detectWormholeDeviceProfile().suggestedPreset;
}

/** Live tunnel ring / ambience quality from store + device (helix excluded). */
export function resolveWormholeTunnelQuality(state: TunnelState): ResolvedWormholeTunnelQuality {
  const device = detectWormholeDeviceProfile();
  const presetId = state.wormholeTunnelQualityPreset;

  let base: WormholeTunnelQualityPreset;
  if (presetId === 'custom') {
    base = {
      id: 'max',
      label: 'Custom (debug)',
      ringSegsInversion: state.wormholeTunnelRingSegsInversion,
      ringSegsClassic: state.wormholeTunnelRingSegsClassic,
      starCount: state.wormholeTunnelStarCount,
      skySegW: state.wormholeTunnelSkySegW,
      skySegH: state.wormholeTunnelSkySegH,
      particleCap: state.wormholeTunnelParticleCap,
      moteSpriteSize: state.wormholeTunnelMoteSpriteSize,
    };
  } else {
    const id = presetId === 'auto' ? resolvePresetId(state) : presetId;
    base = presetForId(id);
  }

  const particleCount = Math.min(
    Math.max(0, state.particleCount),
    Math.max(0, base.particleCap),
  );

  const dpr =
    typeof window !== 'undefined'
      ? webglWormholePixelRatio(window.devicePixelRatio || 1)
      : 1;

  return {
    ...base,
    presetId,
    device,
    particleCount,
    ringCount: state.ringCount,
    ringSpacing: state.ringSpacing,
    rendererDpr: dpr,
    rendererAntialias: typeof window !== 'undefined' ? webglWormholeAntialias() : true,
  };
}

export function applyWormholeTunnelQualityPresetToStore(
  preset: Exclude<WormholeTunnelQualityPresetId, 'auto' | 'custom'>,
): void {
  const p = presetForId(preset);
  const rev = tunnelStore.getState().wormholeTunnelQualityRevision;
  tunnelStore.setState({
    wormholeTunnelQualityPreset: preset,
    wormholeTunnelRingSegsInversion: p.ringSegsInversion,
    wormholeTunnelRingSegsClassic: p.ringSegsClassic,
    wormholeTunnelStarCount: p.starCount,
    wormholeTunnelSkySegW: p.skySegW,
    wormholeTunnelSkySegH: p.skySegH,
    wormholeTunnelParticleCap: p.particleCap,
    wormholeTunnelMoteSpriteSize: p.moteSpriteSize,
    /** Live motes = min(cap, count) — bump count with cap so presets visibly change drift density. */
    particleCount: p.particleCap,
    wormholeTunnelQualityRevision: rev + 1,
  });
}

export function syncCustomQualityFromAuto(): void {
  const s = tunnelStore.getState();
  const auto = resolveWormholeTunnelQuality({
    ...s,
    wormholeTunnelQualityPreset: 'auto',
  });
  const rev = s.wormholeTunnelQualityRevision;
  tunnelStore.setState({
    wormholeTunnelQualityPreset: 'custom',
    wormholeTunnelRingSegsInversion: auto.ringSegsInversion,
    wormholeTunnelRingSegsClassic: auto.ringSegsClassic,
    wormholeTunnelStarCount: auto.starCount,
    wormholeTunnelSkySegW: auto.skySegW,
    wormholeTunnelSkySegH: auto.skySegH,
    wormholeTunnelParticleCap: auto.particleCap,
    wormholeTunnelMoteSpriteSize: auto.moteSpriteSize,
    particleCount: auto.particleCount,
    wormholeTunnelQualityRevision: rev + 1,
  });
}

/** Custom quality fields — set `rebuild: false` while dragging a range slider, then call {@link rebuildWormholeTunnelFromQualitySettings}. */
export function patchWormholeTunnelQualityCustom(
  patch: Partial<
    Pick<
      TunnelState,
      | 'wormholeTunnelRingSegsInversion'
      | 'wormholeTunnelRingSegsClassic'
      | 'wormholeTunnelStarCount'
      | 'wormholeTunnelSkySegW'
      | 'wormholeTunnelSkySegH'
      | 'wormholeTunnelParticleCap'
      | 'wormholeTunnelMoteSpriteSize'
      | 'particleCount'
    >
  >,
  opts?: { rebuild?: boolean },
): void {
  const rev = tunnelStore.getState().wormholeTunnelQualityRevision;
  const rebuild = opts?.rebuild !== false;
  const next: Partial<TunnelState> = {
    ...patch,
    wormholeTunnelQualityPreset: 'custom',
  };
  if (
    rebuild &&
    patch.wormholeTunnelParticleCap != null &&
    patch.particleCount == null
  ) {
    next.particleCount = patch.wormholeTunnelParticleCap;
  }
  if (rebuild) {
    next.wormholeTunnelQualityRevision = rev + 1;
  }
  tunnelStore.setState(next);
}

export function rebuildWormholeTunnelFromQualitySettings(): void {
  const rev = tunnelStore.getState().wormholeTunnelQualityRevision;
  tunnelStore.setState({ wormholeTunnelQualityRevision: rev + 1 });
}
