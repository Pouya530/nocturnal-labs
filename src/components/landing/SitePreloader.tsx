'use client';

import { useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';

import { motionPrefs } from '@/core/motion';
import { NL_BOOT_CHROME_HIDE_STYLE_ID } from '@/lib/nlBootChromeCover';
import { mountDevPostPreloaderBlackCover } from '@/preloader/devPostPreloaderFade';
import { mountTerminalPreloader, unmountTerminalPreloader } from '@/preloader/terminalPreloader';

export type SitePreloaderProps = {
  /** Fires when dismissal fade begins (parallel with cinematic backdrops). */
  onGone?: () => void;
  /** Fires when the overlay is fully gone — use for hero stage reveal. */
  onFadeComplete?: () => void;
};

/**
 * Linux-style terminal boot sequence (TERMINAL_BOOT_PRELOADER.md), then fade out.
 * Mounts to `document.body`; keeps the same `onGone` / `onFadeComplete` contract as the legacy preloader.
 */
export function SitePreloader({ onGone, onFadeComplete }: SitePreloaderProps = {}): ReactElement | null {
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  const onFadeCompleteRef = useRef(onFadeComplete);
  onFadeCompleteRef.current = onFadeComplete;
  const devBlackCoverRef = useRef<ReturnType<typeof mountDevPostPreloaderBlackCover>>(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = 'hidden';

    const reduced = motionPrefs.reduced;
    const isDev = process.env.NODE_ENV === 'development';

    mountTerminalPreloader({
      onGone: () => {
        if (isDev && !reduced) {
          devBlackCoverRef.current = mountDevPostPreloaderBlackCover();
        }
        onGoneRef.current?.();
      },
      onFadeComplete: () => {
        const cover = devBlackCoverRef.current;
        if (isDev && !reduced && cover) {
          devBlackCoverRef.current = null;
          cover.fadeOut(() => onFadeCompleteRef.current?.());
          return;
        }
        onFadeCompleteRef.current?.();
      },
      reduced,
      autoAdvance: true,
      autoAdvanceMs: 1800,
      timeScale: 1,
    });

    document.getElementById(NL_BOOT_CHROME_HIDE_STYLE_ID)?.remove();

    return () => {
      document.body.style.overflow = '';
      devBlackCoverRef.current?.teardown();
      devBlackCoverRef.current = null;
      unmountTerminalPreloader();
    };
  }, []);

  return null;
}
