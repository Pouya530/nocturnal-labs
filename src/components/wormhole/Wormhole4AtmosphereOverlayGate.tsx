'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { Wormhole4AtmosphereOverlay } from '@/components/wormhole/Wormhole4AtmosphereOverlay';
import { tunnelStore } from '@/tunnel/tunnelStore';

export type Wormhole4AtmosphereOverlayGateProps = {
  fullscreenBleed?: boolean;
};

/** Lab routes: mounts `Wormhole4AtmosphereOverlay` when preset is not `off`. */
export function Wormhole4AtmosphereOverlayGate({
  fullscreenBleed = false,
}: Wormhole4AtmosphereOverlayGateProps): ReactElement | null {
  const preset = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeAtmospherePreset,
    () => 'nebula' as const,
  );
  if (preset === 'off') return null;
  return <Wormhole4AtmosphereOverlay fullscreenBleed={fullscreenBleed} preset={preset} />;
}
