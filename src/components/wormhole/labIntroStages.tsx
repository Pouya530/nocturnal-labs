'use client';

import type { ReactNode, ReactElement } from 'react';

import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';

/** Stage reveal — existing depth + `--stage-reveal-*` (see CinematicHeroStage). */
export function StageRevealLabStage({ children }: { children: ReactNode }): ReactElement {
  return <CinematicHeroStage>{children}</CinematicHeroStage>;
}

/** PRISM BREACH — THREE_INTRO_SEQUENCES.md (ghost layers duplicate subject for chromatic merge). */
export function PrismBreachLabStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="prism-stage relative mx-auto flex w-full min-w-0 max-w-full justify-center overflow-visible [transform-style:preserve-3d]">
      <div className="prism-ghost prism-ghost--r">{children}</div>
      <div className="prism-ghost prism-ghost--g">{children}</div>
      <div className="prism-scanline pointer-events-none" aria-hidden />
      <div className="prism-subject relative z-[1] min-w-0 [transform-style:preserve-3d]">{children}</div>
    </div>
  );
}

/** GHOST ECHO — five ghost layers + subject. */
export function GhostEchoLabStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="ghost-stage relative mx-auto flex w-full min-w-0 max-w-full justify-center overflow-visible">
      <div className="ghost ghost--0">{children}</div>
      <div className="ghost ghost--1">{children}</div>
      <div className="ghost ghost--2">{children}</div>
      <div className="ghost ghost--3">{children}</div>
      <div className="ghost ghost--4">{children}</div>
      <div className="ghost-subject relative z-[1] min-w-0 [transform-style:preserve-3d]">{children}</div>
    </div>
  );
}

/** GRAVITY WELL — bloom ring + subject (vignette is fixed in Wormhole5ClientShell). */
export function GravityWellLabStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="gravity-stage relative mx-auto grid w-full min-w-0 max-w-full place-items-center overflow-visible">
      <div className="gravity-bloom pointer-events-none" aria-hidden />
      <div className="gravity-subject relative z-[2] min-w-0 [transform-style:preserve-3d]">{children}</div>
    </div>
  );
}
