'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { Logo } from '@/components/Hero/Logo';
import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { WormholeCoinDepthScale } from '@/components/wormhole/WormholeCoinDepthScale';
import { WormholeFallingCoin } from '@/components/wormhole/WormholeFallingCoin';
import { dmSans } from '@/lib/fonts';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

const COIN_SCROLL_FORWARD_VEL_REF = 4;
const COIN_SCROLL_FORWARD_OPACITY_MIN = 0.72;

function wormholeForwardScrollExcess(velocity: number, mode: ScrollMode, idleForward: number): number {
  if (mode === 'locked' && idleForward > 0) {
    return Math.max(0, velocity - idleForward - 0.06);
  }
  return Math.max(0, velocity - 0.06);
}

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

function useWormholeCoinScrollForwardOpacity(): number {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => {
      const s = tunnelStore.getState();
      if (!s.wormholeCoinFadeOnScrollForward) return 1;
      const advance = wormholeForwardScrollExcess(s.velocity, s.mode, s.wormholeIdleForward);
      const u = Math.min(1, advance / COIN_SCROLL_FORWARD_VEL_REF);
      return 1 + (COIN_SCROLL_FORWARD_OPACITY_MIN - 1) * u;
    },
    () => 1,
  );
}

/** `/wormhole2` — vortex + optional 3D wormhole shell; same hero coin as `/wormhole`. */
export function Wormhole2PlanContent(): ReactElement {
  const coinVisible = useWormholeCoinVisible();
  const blackHoleOverlay = useWormholeBlackHoleOverlayEnabled();
  const coinScrollForwardOpacity = useWormholeCoinScrollForwardOpacity();

  return (
    <main
      aria-label="Wormhole vortex lab"
      className={[
        'flex min-h-[100dvh] flex-col items-center justify-center overflow-visible px-6 py-24 text-center',
        dmSans.className,
      ].join(' ')}
    >
      {coinVisible ? (
        <div
          className="hero-logo-size-var mx-auto flex w-full max-w-full justify-center"
          style={{ opacity: coinScrollForwardOpacity }}
        >
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
