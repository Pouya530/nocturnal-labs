'use client';

import type { ReactNode, ReactElement } from 'react';

/**
 * 3D depth + scale on the logo block, driven by global `--nl-intro` (0 start → 1 settled).
 * Matches the portal zoom on the fractal: mark feels closer/larger at t=0, receding as t→1.
 */
export function CinematicHeroStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="cinematic-hero-perspective w-full min-w-0 overflow-visible [perspective:1500px] [-webkit-backface-visibility:visible] [backface-visibility:visible]">
      <div className="cinematic-hero-depth w-full min-w-0 overflow-visible [transform-style:preserve-3d] [-webkit-backface-visibility:visible] [backface-visibility:visible]">
        {children}
      </div>
    </div>
  );
}
