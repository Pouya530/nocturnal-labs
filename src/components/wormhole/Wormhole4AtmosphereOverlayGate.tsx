'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { Wormhole4AtmosphereOverlay } from '@/components/wormhole/Wormhole4AtmosphereOverlay';
import { tunnelStore } from '@/tunnel/tunnelStore';

export type Wormhole4AtmosphereOverlayGateProps = {
  fullscreenBleed?: boolean;
};

/** `/wormhole4`–`/wormhole5`: mounts `Wormhole4AtmosphereOverlay` when tunnel debug allows it. */
export function Wormhole4AtmosphereOverlayGate({
  fullscreenBleed = false,
}: Wormhole4AtmosphereOverlayGateProps): ReactElement | null {
  const enabled = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeAtmosphereOverlayEnabled,
    () => true,
  );
  if (!enabled) return null;
  return <Wormhole4AtmosphereOverlay fullscreenBleed={fullscreenBleed} />;
}
