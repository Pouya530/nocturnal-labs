'use client';

import type { MutableRefObject, ReactElement } from 'react';

import { JuliaVortexFractalBackdrop } from '@/components/landing/JuliaVortexFractalBackdrop';

export type JuliaVortext2FractalBackdropProps = {
  introTRef?: MutableRefObject<number>;
};

/** Duplicate of Vortex mode with wheel-driven in/out zoom. */
export function JuliaVortext2FractalBackdrop({
  introTRef,
}: JuliaVortext2FractalBackdropProps): ReactElement {
  return (
    <JuliaVortexFractalBackdrop
      introTRef={introTRef}
      scrollZoom
      innerTimeScale={1}
      baseZoomOffset={-1.22}
      scrollZoomSensitivity={0.00125}
      scrollZoomFriction={0.75}
    />
  );
}
