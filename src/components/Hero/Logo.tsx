'use client';

import dynamic from 'next/dynamic';
import type { AnimationEvent, KeyboardEvent, ReactElement } from 'react';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import type { LogoCoinCanvasProps } from '@/components/Hero/LogoCoin';
import { motionPrefs } from '@/core/motion';

const LogoCoinCanvas = dynamic<LogoCoinCanvasProps>(
  () => import('@/components/Hero/LogoCoin').then((m) => m.LogoCoinCanvas),
  { ssr: false },
);

/**
 * 3D coin mark: same logo texture on both faces, iridescent rim glow, slow spin.
 * Click runs a 3D toss: outer layer animates lift/return; inner uses linear rotateX
 * so the flip does not “hover” in spin at the apex. Full-screen fractal is unchanged.
 */
export function Logo(): ReactElement {
  const reducedMotion = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );

  const [elevation, setElevation] = useState(false);
  const cycleLock = useRef(false);
  const moveRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);

  const playLift = useCallback(() => {
    if (reducedMotion || cycleLock.current) return;
    const move = moveRef.current;
    const spin = spinRef.current;
    if (!move || !spin) return;
    cycleLock.current = true;
    setElevation(true);
    move.classList.remove('logo-coin-lift-animating-move');
    spin.classList.remove('logo-coin-lift-animating-spin');
    void move.offsetWidth;
    move.classList.add('logo-coin-lift-animating-move');
    spin.classList.add('logo-coin-lift-animating-spin');
  }, [reducedMotion]);

  const onAnimationEnd = useCallback((e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== 'logo-coin-lift-move') return;
    e.currentTarget.classList.remove('logo-coin-lift-animating-move');
    spinRef.current?.classList.remove('logo-coin-lift-animating-spin');
    cycleLock.current = false;
    setElevation(false);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playLift();
      }
    },
    [playLift],
  );

  return (
    <div
      className={[
        'logo-coin-stage relative mx-auto aspect-square w-[var(--hero-logo-size,200px)] max-w-full min-w-0 shrink-0 overflow-visible [perspective:1200px]',
        elevation ? 'z-30' : 'z-0',
      ].join(' ')}
    >
      <div
        className="h-full w-full min-h-0 cursor-pointer touch-manipulation overflow-visible outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400/60"
        role="button"
        tabIndex={0}
        aria-label="Nocturnal Labs logo, 3D coin with iridescent edge. Activate to flip the coin toward the top of the screen and back."
        onClick={playLift}
        onKeyDown={onKeyDown}
      >
        <div
          ref={moveRef}
          className="h-full w-full min-h-0 overflow-visible [transform-style:preserve-3d] [-webkit-backface-visibility:visible] [backface-visibility:visible]"
          onAnimationEnd={onAnimationEnd}
        >
          <div
            ref={spinRef}
            className="h-full w-full min-h-0 overflow-visible [transform-style:preserve-3d] [-webkit-backface-visibility:visible] [backface-visibility:visible]"
          >
            <div className="block h-full w-full min-h-0 overflow-visible leading-none" aria-hidden>
              <LogoCoinCanvas spin={!reducedMotion} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
