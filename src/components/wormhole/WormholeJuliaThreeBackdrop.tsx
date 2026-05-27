'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import {
  JuliaWormholeBackdrop,
  type WormholeTunnelMode,
} from '@/components/landing/JuliaWormholeBackdrop';
import { tunnelStore } from '@/tunnel/tunnelStore';

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
  /** `/wormhole6` — journey camera + desktop mouse aim from first frame (see `JuliaWormholeBackdrop`). */
  journeyCameraFromStart?: boolean;
  /** `/wormhole5` — opening journey zoom-out driven by `wormholeHomeIntroCam01` (see `JuliaWormholeBackdrop`). */
  openingJourneyCameraIntro?: boolean;
  /** `/wormhole6` — fullscreen helix bundle scale ({@link WORMHOLE_HOME_HELIX_FULLSCREEN_WALL_MUL}). */
  helixLabFullscreen?: boolean;
  /** Optional helix bundle inset when not fullscreen — see `JuliaWormholeBackdrop` `helixWallInsetMul`. */
  helixWallInsetMul?: number;
  /**
   * Production home only: helix ribbons match `/wormhole2` grading + spiraling feel without touching
   * rings or tunnel depth (`JuliaWormholeBackdrop` applies helix-only shading + synthetic twist).
   */
  helixWormhole2RibbonStyle?: boolean;
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
  journeyCameraFromStart = false,
  openingJourneyCameraIntro = false,
  helixLabFullscreen = false,
  helixWallInsetMul,
  helixWormhole2RibbonStyle = false,
}: WormholeJuliaThreeBackdropProps): ReactElement | null {
  const wormhole3dEnabled = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormhole3dBackgroundEnabled,
    () => true,
  );

  if (!wormhole3dEnabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] h-[100dvh] w-screen">
      <JuliaWormholeBackdrop
        helixLab={helixLab}
        tunnelMode={tunnelMode}
        ringGrowthInversion={ringGrowthInversion}
        throatCameraJourney={throatCameraJourney}
        introRingsOverlay={introRingsOverlay}
        journeyCameraFromStart={journeyCameraFromStart}
        openingJourneyCameraIntro={openingJourneyCameraIntro}
        helixLabFullscreen={helixLabFullscreen}
        helixWallInsetMul={helixWallInsetMul}
        helixWormhole2RibbonStyle={helixWormhole2RibbonStyle}
      />
    </div>
  );
}
