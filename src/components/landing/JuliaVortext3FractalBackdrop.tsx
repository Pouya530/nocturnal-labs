'use client';

import type { MutableRefObject, ReactElement } from 'react';

import { JuliaVortexFractalBackdrop } from '@/components/landing/JuliaVortexFractalBackdrop';

export type JuliaVortext3FractalBackdropProps = {
  introTRef?: MutableRefObject<number>;
};

/** Duplicate of Vortext 2 mode with wheel-driven in/out zoom. */
export function JuliaVortext3FractalBackdrop({
  introTRef,
}: JuliaVortext3FractalBackdropProps): ReactElement {
  return <JuliaVortexFractalBackdrop introTRef={introTRef} scrollZoom speedMultiplier={0.10546875} />;
}
