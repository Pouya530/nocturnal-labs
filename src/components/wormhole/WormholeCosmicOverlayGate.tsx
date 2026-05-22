'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { CosmicBackdrop } from '@/components/cosmic/CosmicBackdrop';
import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * Optional second GL stack: full {@link CosmicBackdrop} above the Julia tunnel (`mix-blend-screen`).
 * Mounted on `/wormhole5` only; toggled from tunnel debug (`wormholeCosmicOverlayEnabled`).
 */
export function WormholeCosmicOverlayGate(): ReactElement | null {
  const on = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeCosmicOverlayEnabled,
    () => false,
  );
  if (!on) return null;
  return <CosmicBackdrop wormholeOverlayStack />;
}
