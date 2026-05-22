'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { Logo } from '@/components/Hero/Logo';
import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { WormholeCoinDepthScale } from '@/components/wormhole/WormholeCoinDepthScale';
import { WormholeFallingCoin } from '@/components/wormhole/WormholeFallingCoin';
import {
  GhostEchoLabStage,
  GravityWellLabStage,
  PrismBreachLabStage,
  StageRevealLabStage,
} from '@/components/wormhole/labIntroStages';
import { useWormholeLabIntroName } from '@/components/wormhole/WormholeLabIntroContext';
import { dmSans } from '@/lib/fonts';
import type { ScrollMode } from '@/tunnel/tunnelStore';
import { tunnelStore } from '@/tunnel/tunnelStore';

/** Scales fade vs forward speed above cruise (`wormholeIdleForward` in locked flight). */
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

/** `/wormhole` — centered coin; wormhole + nav come from the shell. */
export type WormholePlanContentProps = {
  /** Passed through to `Logo` for localhost coin tap → tunnel impulse ({@link queueWormholeCoinScrollBoost}). */
  scrollImpulseSign?: number;
};

export function WormholePlanContent({
  scrollImpulseSign = 1,
}: WormholePlanContentProps): ReactElement {
  const coinVisible = useWormholeCoinVisible();
  const blackHoleOverlay = useWormholeBlackHoleOverlayEnabled();
  const coinScrollForwardOpacity = useWormholeCoinScrollForwardOpacity();
  const labIntro = useWormholeLabIntroName();

  const coinTree = (
    <WormholeCoinDepthScale>
      <WormholeFallingCoin>
        <Logo
          hideBlackHoleOverlay={!blackHoleOverlay}
          spinSyncScroll
          tunnelScrollImpulseSign={scrollImpulseSign}
        />
      </WormholeFallingCoin>
    </WormholeCoinDepthScale>
  );

  const heroStage =
    labIntro === 'prism-breach' ? (
      <PrismBreachLabStage>{coinTree}</PrismBreachLabStage>
    ) : labIntro === 'ghost-echo' ? (
      <GhostEchoLabStage>{coinTree}</GhostEchoLabStage>
    ) : labIntro === 'gravity-well' ? (
      <GravityWellLabStage>{coinTree}</GravityWellLabStage>
    ) : labIntro !== null ? (
      <StageRevealLabStage>{coinTree}</StageRevealLabStage>
    ) : (
      <CinematicHeroStage>{coinTree}</CinematicHeroStage>
    );

  return (
    <main
      aria-label="Wormhole"
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
          {heroStage}
        </div>
      ) : null}
    </main>
  );
}
