'use client';

import dynamic from 'next/dynamic';
import type { AnimationEvent, KeyboardEvent, ReactElement } from 'react';
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { BlackHoleOverlay } from '@/components/Hero/BlackHoleOverlay';
import type { LogoCoinCanvasProps } from '@/components/Hero/LogoCoin';
import { motionPrefs } from '@/core/motion';
import { queueWormholeCoinScrollBoost } from '@/hooks/useScrollDepth';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import { tunnelStore } from '@/tunnel/tunnelStore';

const LogoCoinCanvas = dynamic<LogoCoinCanvasProps>(
  () => import('@/components/Hero/LogoCoin').then((m) => m.LogoCoinCanvas),
  { ssr: false },
);

/** Wheel-normalized magnitude for tap impulse; multiplied by route `scrollImpulseSign` (“scroll up”). */
const COIN_CLICK_TUNNEL_BOOST_MAG = 56;

export type LogoProps = {
  /** When true, omits the radial vignette behind the coin (e.g. wormhole preview). */
  hideBlackHoleOverlay?: boolean;
  /** When true (wormhole), coin spin tracks scroll velocity from the tunnel store. */
  spinSyncScroll?: boolean;
  /** Matches `LocalTunnelChrome` `scrollOptions.impulseSign` when wormhole routes invert wheel (+1 default). */
  tunnelScrollImpulseSign?: number;
};

/**
 * 3D coin mark: distinct front/back textures, iridescent rim, idle Y spin.
 * Click runs a toss (flip); wormhole + localhost + tunnel debug toggle can swap clicks for a tunnel scroll boost instead.
 */
export function Logo(props: LogoProps): ReactElement {
  const {
    hideBlackHoleOverlay = false,
    spinSyncScroll = false,
    tunnelScrollImpulseSign = 1,
  } = props;
  const reducedMotion = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );
  const coinClickTunnelBoost = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().wormholeCoinClickTunnelBoost,
    () => false,
  );

  const [elevation, setElevation] = useState(false);
  const [tossToken, setTossToken] = useState(0);
  const cycleLock = useRef(false);
  const moveRef = useRef<HTMLDivElement>(null);

  const useTunnelBoostOnActivate =
    spinSyncScroll &&
    typeof window !== 'undefined' &&
    isLocalhostHostname(window.location.hostname) &&
    coinClickTunnelBoost;

  const activateAriaLabel = useMemo(() => {
    if (useTunnelBoostOnActivate) {
      return 'Nocturnal Labs logo, 3D coin. Activate to nudge tunnel scroll (localhost lab).';
    }
    return 'Nocturnal Labs logo, 3D coin with iridescent edge. Activate to flip the coin toward the top of the screen and back.';
  }, [useTunnelBoostOnActivate]);

  const playLift = useCallback(() => {
    if (reducedMotion || cycleLock.current) return;
    const move = moveRef.current;
    if (!move) return;
    cycleLock.current = true;
    setElevation(true);
    setTossToken((n) => n + 1);
    move.classList.remove('logo-coin-lift-animating-move');
    void move.offsetWidth;
    move.classList.add('logo-coin-lift-animating-move');
  }, [reducedMotion]);

  const onAnimationEnd = useCallback((e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== 'logo-coin-lift-move') return;
    e.currentTarget.classList.remove('logo-coin-lift-animating-move');
    cycleLock.current = false;
    setElevation(false);
  }, []);

  const onActivate = useCallback(() => {
    if (
      spinSyncScroll &&
      typeof window !== 'undefined' &&
      isLocalhostHostname(window.location.hostname) &&
      tunnelStore.getState().wormholeCoinClickTunnelBoost
    ) {
      queueWormholeCoinScrollBoost(-COIN_CLICK_TUNNEL_BOOST_MAG * tunnelScrollImpulseSign);
      return;
    }
    playLift();
  }, [spinSyncScroll, tunnelScrollImpulseSign, playLift]);

  const onKeyDownActivate = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
    [onActivate],
  );

  return (
    <div
      className={[
        'logo-coin-stage relative mx-auto aspect-square w-[calc(var(--hero-logo-size,200px)*var(--hero-logo-scale,1))] max-w-full min-w-0 shrink-0 overflow-visible [perspective:1200px]',
        elevation ? 'z-30' : 'z-0',
      ].join(' ')}
    >
      {!hideBlackHoleOverlay ? <BlackHoleOverlay /> : null}
      <div
        className="hero-logo-iridescent-soft hero-logo-iridescent-soft--coin pointer-events-none"
        aria-hidden
      />
      <div
        className="relative z-10 h-full w-full min-h-0 cursor-pointer touch-manipulation overflow-visible outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400/60"
        role="button"
        tabIndex={0}
        aria-label={activateAriaLabel}
        onClick={onActivate}
        onKeyDown={onKeyDownActivate}
      >
        <div
          ref={moveRef}
          className="h-full w-full min-h-0 overflow-visible [transform-style:preserve-3d] [-webkit-backface-visibility:visible] [backface-visibility:visible]"
          onAnimationEnd={onAnimationEnd}
        >
          <div className="block h-full w-full min-h-0 overflow-visible leading-none" aria-hidden>
            <LogoCoinCanvas spin={!reducedMotion} tossToken={tossToken} spinSyncScroll={spinSyncScroll} />
          </div>
        </div>
      </div>
    </div>
  );
}
