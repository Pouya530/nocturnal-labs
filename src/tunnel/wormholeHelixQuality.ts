/**
 * Wormhole **helix tube** geometry quality (path samples, radial segments, lab ribbon shape).
 * Does not change Julia ring stack, stars, sky, or helix shader variant uniforms.
 */

import {
  WORMHOLE_DESKTOP_PROD_HELIX_PATH_PTS,
  WORMHOLE_DESKTOP_PROD_HELIX_TUBE_RADIAL_SEGS,
} from '@/lib/wormholePageConfig';
import { wormholeNarrowViewport } from '@/lib/webglMobilePrefs';
import {
  detectWormholeDeviceProfile,
  type WormholeDeviceProfile,
} from '@/tunnel/wormholeTunnelQuality';
import { tunnelStore, type TunnelState } from '@/tunnel/tunnelStore';

export type WormholeHelixQualityPresetId =
  | 'auto'
  | 'max'
  | 'lab'
  | 'mobile'
  | 'mobile-narrow'
  | 'fold-inner'
  | 'low'
  | 'custom';

export type WormholeHelixQualityPreset = {
  id: Exclude<WormholeHelixQualityPresetId, 'auto' | 'custom'>;
  label: string;
  pathPts: number;
  tubeRadialSegs: number;
  tubeRadius: number;
  twistTurns: number;
  radialScale: number;
  wobbleAmp: number;
  wobbleFreq: number;
  opacity: number;
  /** Applied on narrow viewports when `helixLab` routes multiply bloom. */
  mobileBloomMul: number;
};

/** Matches {@link HELIX_LAB} in `JuliaWormholeBackdrop` — current dev / wormhole5 look. */
const HELIX_LAB_SHAPE = {
  tubeRadius: 0.2,
  twistTurns: 3.1,
  radialScale: 0.96,
  wobbleAmp: 0.58,
  wobbleFreq: 9.5,
  opacity: 0.78,
} as const;

export const WORMHOLE_HELIX_QUALITY_PRESETS: Record<
  Exclude<WormholeHelixQualityPresetId, 'auto' | 'custom'>,
  WormholeHelixQualityPreset
> = {
  max: {
    id: 'max',
    label: 'Max (desktop path density)',
    pathPts: WORMHOLE_DESKTOP_PROD_HELIX_PATH_PTS,
    tubeRadialSegs: WORMHOLE_DESKTOP_PROD_HELIX_TUBE_RADIAL_SEGS,
    ...HELIX_LAB_SHAPE,
    mobileBloomMul: 1,
  },
  lab: {
    id: 'lab',
    label: 'Lab (dev / wormhole5 default)',
    pathPts: 900,
    tubeRadialSegs: 8,
    ...HELIX_LAB_SHAPE,
    mobileBloomMul: 0.75,
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile / touch (coarse)',
    pathPts: 650,
    tubeRadialSegs: 6,
    ...HELIX_LAB_SHAPE,
    mobileBloomMul: 0.75,
  },
  'mobile-narrow': {
    id: 'mobile-narrow',
    label: 'Mobile narrow (≤767px)',
    pathPts: 500,
    tubeRadialSegs: 5,
    ...HELIX_LAB_SHAPE,
    mobileBloomMul: 0.7,
  },
  'fold-inner': {
    id: 'fold-inner',
    label: 'Fold inner portrait (840–980px)',
    pathPts: 700,
    tubeRadialSegs: 6,
    ...HELIX_LAB_SHAPE,
    mobileBloomMul: 0.75,
  },
  low: {
    id: 'low',
    label: 'Low (perf test)',
    pathPts: 400,
    tubeRadialSegs: 4,
    tubeRadius: 0.2,
    twistTurns: 3.1,
    radialScale: 0.96,
    wobbleAmp: 0.5,
    wobbleFreq: 9.5,
    opacity: 0.72,
    mobileBloomMul: 0.65,
  },
};

export type ResolvedWormholeHelixQuality = WormholeHelixQualityPreset & {
  presetId: WormholeHelixQualityPresetId;
  device: WormholeDeviceProfile;
  /** Effective bloom scale on narrow + helixLab (1 = no reduction). */
  effectiveMobileBloomMul: number;
};

function presetForId(
  id: Exclude<WormholeHelixQualityPresetId, 'auto' | 'custom'>,
): WormholeHelixQualityPreset {
  return WORMHOLE_HELIX_QUALITY_PRESETS[id];
}

function resolvePresetId(state: TunnelState): Exclude<WormholeHelixQualityPresetId, 'auto' | 'custom'> {
  if (state.wormholeHelixQualityPreset !== 'auto' && state.wormholeHelixQualityPreset !== 'custom') {
    return state.wormholeHelixQualityPreset;
  }
  const device = detectWormholeDeviceProfile();
  if (device.foldInnerPortrait) return 'fold-inner';
  if (device.narrowViewport) return 'mobile-narrow';
  if (device.ringsMaxAuto) return 'lab';
  if (device.coarseTouch || device.iosLike) return 'mobile';
  return 'lab';
}

/** Live helix tube geometry from store + device (ring stack excluded). */
export function resolveWormholeHelixQuality(state: TunnelState): ResolvedWormholeHelixQuality {
  const device = detectWormholeDeviceProfile();
  const presetId = state.wormholeHelixQualityPreset;

  let base: WormholeHelixQualityPreset;
  if (presetId === 'custom') {
    base = {
      id: 'lab',
      label: 'Custom (debug)',
      pathPts: state.wormholeHelixPathPts,
      tubeRadialSegs: state.wormholeHelixTubeRadialSegs,
      tubeRadius: state.wormholeHelixTubeRadius,
      twistTurns: state.wormholeHelixTwistTurns,
      radialScale: state.wormholeHelixRadialScale,
      wobbleAmp: state.wormholeHelixWobbleAmp,
      wobbleFreq: state.wormholeHelixWobbleFreq,
      opacity: state.wormholeHelixOpacity,
      mobileBloomMul: state.wormholeHelixMobileBloomMul,
    };
  } else {
    const id = presetId === 'auto' ? resolvePresetId(state) : presetId;
    base = presetForId(id);
  }

  const narrow = typeof window !== 'undefined' && wormholeNarrowViewport();
  const effectiveMobileBloomMul = narrow ? base.mobileBloomMul : 1;

  return {
    ...base,
    presetId,
    device,
    effectiveMobileBloomMul,
  };
}

export function applyWormholeHelixQualityPresetToStore(
  preset: Exclude<WormholeHelixQualityPresetId, 'auto' | 'custom'>,
): void {
  const p = presetForId(preset);
  const rev = tunnelStore.getState().wormholeHelixQualityRevision;
  tunnelStore.setState({
    wormholeHelixQualityPreset: preset,
    wormholeHelixPathPts: p.pathPts,
    wormholeHelixTubeRadialSegs: p.tubeRadialSegs,
    wormholeHelixTubeRadius: p.tubeRadius,
    wormholeHelixTwistTurns: p.twistTurns,
    wormholeHelixRadialScale: p.radialScale,
    wormholeHelixWobbleAmp: p.wobbleAmp,
    wormholeHelixWobbleFreq: p.wobbleFreq,
    wormholeHelixOpacity: p.opacity,
    wormholeHelixMobileBloomMul: p.mobileBloomMul,
    wormholeHelixQualityRevision: rev + 1,
  });
}

export function syncCustomHelixQualityFromAuto(): void {
  const s = tunnelStore.getState();
  const auto = resolveWormholeHelixQuality({ ...s, wormholeHelixQualityPreset: 'auto' });
  const rev = s.wormholeHelixQualityRevision;
  tunnelStore.setState({
    wormholeHelixQualityPreset: 'custom',
    wormholeHelixPathPts: auto.pathPts,
    wormholeHelixTubeRadialSegs: auto.tubeRadialSegs,
    wormholeHelixTubeRadius: auto.tubeRadius,
    wormholeHelixTwistTurns: auto.twistTurns,
    wormholeHelixRadialScale: auto.radialScale,
    wormholeHelixWobbleAmp: auto.wobbleAmp,
    wormholeHelixWobbleFreq: auto.wobbleFreq,
    wormholeHelixOpacity: auto.opacity,
    wormholeHelixMobileBloomMul: auto.mobileBloomMul,
    wormholeHelixQualityRevision: rev + 1,
  });
}

/** Custom helix geometry — set `rebuild: false` while dragging, then {@link rebuildWormholeHelixFromQualitySettings}. */
export function patchWormholeHelixQualityCustom(
  patch: Partial<
    Pick<
      TunnelState,
      | 'wormholeHelixPathPts'
      | 'wormholeHelixTubeRadialSegs'
      | 'wormholeHelixTubeRadius'
      | 'wormholeHelixTwistTurns'
      | 'wormholeHelixRadialScale'
      | 'wormholeHelixWobbleAmp'
      | 'wormholeHelixWobbleFreq'
      | 'wormholeHelixOpacity'
      | 'wormholeHelixMobileBloomMul'
    >
  >,
  opts?: { rebuild?: boolean },
): void {
  const rev = tunnelStore.getState().wormholeHelixQualityRevision;
  const rebuild = opts?.rebuild !== false;
  tunnelStore.setState({
    ...patch,
    wormholeHelixQualityPreset: 'custom',
    ...(rebuild ? { wormholeHelixQualityRevision: rev + 1 } : {}),
  });
}

export function rebuildWormholeHelixFromQualitySettings(): void {
  const rev = tunnelStore.getState().wormholeHelixQualityRevision;
  tunnelStore.setState({ wormholeHelixQualityRevision: rev + 1 });
}
