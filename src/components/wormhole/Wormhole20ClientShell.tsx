'use client';

import type { ReactNode, ReactElement } from 'react';

import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/**
 * `/wormhole20` — {@link Wormhole5ClientShell} with FFT Julia equalizer enabled (localhost dev).
 */
export function Wormhole20ClientShell({ children }: { children: ReactNode }): ReactElement {
  return <Wormhole5ClientShell juliaEqualizerLab>{children}</Wormhole5ClientShell>;
}
