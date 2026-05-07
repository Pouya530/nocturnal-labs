'use client';

import dynamic from 'next/dynamic';
import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import type { WormholeTunnelMode } from '@/components/landing/JuliaWormholeBackdrop';
import { tunnelStore } from '@/tunnel/tunnelStore';

const JuliaWormholeBackdrop = dynamic(
  () =>
    import('@/components/landing/JuliaWormholeBackdrop').then((mod) => mod.JuliaWormholeBackdrop),
  { ssr: false, loading: () => null },
);

export type { WormholeTunnelMode };

export type WormholeJuliaThreeBackdropProps = {
  /**
   * Wider lab helices (Julia on tubes). Without `ringGrowthInversion`, rings are omitted — tunnel is
   * strands only (`/wormhole2`). With inversion + `introRingsOverlay`, see `/wormhole5` / `/wormhole6`.
   */
  helixLab?: boolean;
  /** `/wormhole3` — throat layout (rings + growth tuned for zoom-in flight). */
  tunnelMode?: WormholeTunnelMode;
  /** `/wormhole4` — shared unit rings + inverted growth (see WORMHOLE_GROWTH_INVERSION_FIX_1.md). */
  ringGrowthInversion?: boolean;
  /** `/wormhole4`+ — journey camera (FOV / dolly / aim); with `helixLab` on `/wormhole5`–`/wormhole6`. */
  throatCameraJourney?: boolean;
  /** `/wormhole5` — front-loaded ring stack overlayed above helices, fades with depth. */
  introRingsOverlay?: boolean;
};

/**
 * Renders `JuliaWormholeBackdrop` only when `tunnelStore.wormhole3dBackgroundEnabled` is true.
 * Used on `/wormhole` and stacked on `/wormhole2` above the vortex WebGL layer.
 */
export function WormholeJuliaThreeBackdrop({
  helixLab = false,
  tunnelMode = 'classic',
  ringGrowthInversion = false,
  throatCameraJourney = false,
  introRingsOverlay = false,
}: WormholeJuliaThreeBackdropProps): ReactElement | null {
  const enabled = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormhole3dBackgroundEnabled,
    () => true,
  );

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] h-[100dvh] w-screen">
      <JuliaWormholeBackdrop
        helixLab={helixLab}
        tunnelMode={tunnelMode}
        ringGrowthInversion={ringGrowthInversion}
        throatCameraJourney={throatCameraJourney}
        introRingsOverlay={introRingsOverlay}
      />
    </div>
  );
}
