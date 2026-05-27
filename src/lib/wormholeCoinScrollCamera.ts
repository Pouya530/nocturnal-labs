/**
 * Hero coin {@link ScrollVelocityCamera} tuning (locked-mode scroll zoom in `LogoCoin.tsx`).
 */

import type { TunnelState } from '@/tunnel/tunnelStore';

export const WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS = {
  lockedZPullDown: 4.35,
  lockedFovDown: 13.2,
  lockedZPushUp: 1.42,
  lockedFovUp: 6.35,
  lockedZSpeedAway: 0.92,
  lockedFovSpeedAway: 3.1,
  velRef: 95,
  lockedVelScale: 2.85,
} as const;

export type WormholeCoinScrollCameraTuning = {
  [K in keyof typeof WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS]: number;
};

export function wormholeCoinScrollCameraStorePatch(
  tuning: WormholeCoinScrollCameraTuning = WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS,
): Pick<
  TunnelState,
  | 'wormholeCoinScrollCamLockedZPullDown'
  | 'wormholeCoinScrollCamLockedFovDown'
  | 'wormholeCoinScrollCamLockedZPushUp'
  | 'wormholeCoinScrollCamLockedFovUp'
  | 'wormholeCoinScrollCamLockedZSpeedAway'
  | 'wormholeCoinScrollCamLockedFovSpeedAway'
  | 'wormholeCoinScrollCamVelRef'
  | 'wormholeCoinScrollCamLockedVelScale'
> {
  return {
    wormholeCoinScrollCamLockedZPullDown: tuning.lockedZPullDown,
    wormholeCoinScrollCamLockedFovDown: tuning.lockedFovDown,
    wormholeCoinScrollCamLockedZPushUp: tuning.lockedZPushUp,
    wormholeCoinScrollCamLockedFovUp: tuning.lockedFovUp,
    wormholeCoinScrollCamLockedZSpeedAway: tuning.lockedZSpeedAway,
    wormholeCoinScrollCamLockedFovSpeedAway: tuning.lockedFovSpeedAway,
    wormholeCoinScrollCamVelRef: tuning.velRef,
    wormholeCoinScrollCamLockedVelScale: tuning.lockedVelScale,
  };
}

export function wormholeCoinScrollCameraFromStore(s: TunnelState): WormholeCoinScrollCameraTuning {
  return {
    lockedZPullDown: s.wormholeCoinScrollCamLockedZPullDown,
    lockedFovDown: s.wormholeCoinScrollCamLockedFovDown,
    lockedZPushUp: s.wormholeCoinScrollCamLockedZPushUp,
    lockedFovUp: s.wormholeCoinScrollCamLockedFovUp,
    lockedZSpeedAway: s.wormholeCoinScrollCamLockedZSpeedAway,
    lockedFovSpeedAway: s.wormholeCoinScrollCamLockedFovSpeedAway,
    velRef: s.wormholeCoinScrollCamVelRef,
    lockedVelScale: s.wormholeCoinScrollCamLockedVelScale,
  };
}

export function rebuildWormholeCoinScrollCamera(): void {
  void import('@/tunnel/tunnelStore').then(({ tunnelStore }) => {
    const rev = tunnelStore.getState().wormholeCoinScrollCamRevision;
    tunnelStore.setState({ wormholeCoinScrollCamRevision: rev + 1 });
  });
}
