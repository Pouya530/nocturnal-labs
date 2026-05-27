'use client';

import { useOrientationTransitionFade } from '@/hooks/useOrientationTransitionFade';

/** Wires {@link useOrientationTransitionFade} — no DOM output (overlay is portaled to `body`). */
export function OrientationTransitionFade({ enabled = true }: { enabled?: boolean }): null {
  useOrientationTransitionFade(enabled);
  return null;
}
