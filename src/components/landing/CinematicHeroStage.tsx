'use client';

import type { ReactNode, ReactElement } from 'react';

/**
 * 3D depth + scale on the logo block, driven by global `--nl-intro` (0 start → 1 settled).
 * Matches the portal zoom on the fractal: mark feels closer/larger at t=0, receding as t→1.
 */
export function CinematicHeroStage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="cinematic-hero-perspective w-full [perspective:1500px]">
      <div className="cinematic-hero-depth w-full [transform-style:preserve-3d]">{children}</div>
    </div>
  );
}
