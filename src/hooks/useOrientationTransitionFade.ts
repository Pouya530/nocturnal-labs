'use client';

import { useEffect, useRef } from 'react';

import { motionPrefs } from '@/core/motion';
import { runOrientationTransitionFade } from '@/lib/orientationTransitionFade';
import { isCoarseOrTouchPrimaryViewport } from '@/lib/webglMobilePrefs';
import { tunnelStore } from '@/tunnel/tunnelStore';

function touchHandsetOrientationEligible(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isCoarseOrTouchPrimaryViewport()) return false;
  return window.matchMedia('(hover: none)').matches;
}

/**
 * Portrait ↔ landscape on phones: brief black cover while layout + hero focal vars settle.
 */
export function useOrientationTransitionFade(enabled = true): void {
  const busyRef = useRef(false);
  const teardownRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    if (motionPrefs.reduced || !touchHandsetOrientationEligible()) return undefined;

    const run = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      teardownRef.current?.();

      tunnelStore.setState({ wormholeTunnelRenderPaused: true });

      teardownRef.current = runOrientationTransitionFade(() => {
        requestAnimationFrame(() => {
          tunnelStore.setState({ wormholeTunnelRenderPaused: false });
          busyRef.current = false;
          teardownRef.current = null;
        });
      });
    };

    const orientationMq = window.matchMedia('(orientation: landscape)');

    window.addEventListener('orientationchange', run);
    orientationMq.addEventListener('change', run);

    return () => {
      window.removeEventListener('orientationchange', run);
      orientationMq.removeEventListener('change', run);
      teardownRef.current?.();
      teardownRef.current = null;
      busyRef.current = false;
    };
  }, [enabled]);
}
