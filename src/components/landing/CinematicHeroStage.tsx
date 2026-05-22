'use client';

import type { ReactNode, ReactElement } from 'react';

/**
 * 3D depth on the hero block + stage-reveal subject (STAGE_REVEAL.md / `--stage-reveal-*` on `documentElement`).
 */
export function CinematicHeroStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="cinematic-hero-perspective stage-reveal-stage-root w-full min-w-0 overflow-visible [perspective:1500px] [-webkit-backface-visibility:visible] [backface-visibility:visible]">
      <div className="cinematic-hero-depth flex w-full min-w-0 justify-center overflow-visible [transform-style:preserve-3d] [-webkit-backface-visibility:visible] [backface-visibility:visible]">
        <div className="cinematic-hero-stage-subject min-w-0 [transform-style:preserve-3d]">
          {children}
        </div>
      </div>
    </div>
  );
}
