'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { Logo } from '@/components/Hero/Logo';
import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { WormholeCoinDepthScale } from '@/components/wormhole/WormholeCoinDepthScale';
import { WormholeFallingCoin } from '@/components/wormhole/WormholeFallingCoin';
import { dmSans } from '@/lib/fonts';
import { tunnelStore } from '@/tunnel/tunnelStore';

function useWormholeCoinVisible(): boolean {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeCoinVisible,
    () => true,
  );
}

function useWormholeBlackHoleOverlayEnabled(): boolean {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeBlackHoleOverlayEnabled,
    () => false,
  );
}

/** `/wormhole` — centered coin; wormhole + nav come from the shell. */
export function WormholePlanContent(): ReactElement {
  const coinVisible = useWormholeCoinVisible();
  const blackHoleOverlay = useWormholeBlackHoleOverlayEnabled();

  return (
    <main
      aria-label="Wormhole"
      className={[
        'flex min-h-[100dvh] flex-col items-center justify-center overflow-visible px-6 py-24 text-center',
        dmSans.className,
      ].join(' ')}
    >
      {coinVisible ? (
        <div className="hero-logo-size-var mx-auto flex w-full max-w-full justify-center">
          <CinematicHeroStage>
            <WormholeCoinDepthScale>
              <WormholeFallingCoin>
                <Logo hideBlackHoleOverlay={!blackHoleOverlay} spinSyncScroll />
              </WormholeFallingCoin>
            </WormholeCoinDepthScale>
          </CinematicHeroStage>
        </div>
      ) : null}
    </main>
  );
}
