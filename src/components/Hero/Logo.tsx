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
 * 3D coin mark: distinct front/back textures, iridescent rim, idle Y spin.
 * Click runs a toss: CSS parabolic lift on the wrapper; flip rotation runs inside WebGL on X
 * so both faces are visible (CSS rotateX on the canvas would not reveal the GL back face).
 */
export function Logo(): ReactElement {
  const reducedMotion = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );

  const [elevation, setElevation] = useState(false);
  const [tossToken, setTossToken] = useState(0);
  const cycleLock = useRef(false);
  const moveRef = useRef<HTMLDivElement>(null);

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
          <div className="block h-full w-full min-h-0 overflow-visible leading-none" aria-hidden>
            <LogoCoinCanvas spin={!reducedMotion} tossToken={tossToken} />
          </div>
        </div>
      </div>
    </div>
  );
}
