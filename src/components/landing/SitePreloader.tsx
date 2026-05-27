'use client';

import { useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';

import { motionPrefs } from '@/core/motion';
import { NL_BOOT_CHROME_HIDE_STYLE_ID } from '@/lib/nlBootChromeCover';
import { mountDevPostPreloaderBlackCover } from '@/preloader/devPostPreloaderFade';
import { mountTerminalPreloader, unmountTerminalPreloader } from '@/preloader/terminalPreloader';
import {
  armWormhole5AmbientFromEnter,
  isWormhole5AmbientAudioRoute,
  teardownWormhole5Ambient,
  warmWormhole5AmbientAudio,
} from '@/audio/wormhole5AmbientAudio';
import { prefetchLogoCoinCanvas } from '@/lib/prefetchHeroAssets';
import { tunnelStore } from '@/tunnel/tunnelStore';

export type SitePreloaderProps = {
  /** Fires when dismissal fade begins (parallel with cinematic backdrops). */
  onGone?: () => void;
  /** Fires when the overlay is fully gone — use for hero stage reveal. */
  onFadeComplete?: () => void;
  /** Home `/` + `/wormhole5`: ENTER button + post-fade ambient playback. */
  wormhole5AmbientAudio?: boolean;
};

/**
 * Linux-style terminal boot sequence (TERMINAL_BOOT_PRELOADER.md), then fade out.
 * Mounts to `document.body`; keeps the same `onGone` / `onFadeComplete` contract as the legacy preloader.
 */
export function SitePreloader({
  onGone,
  onFadeComplete,
  wormhole5AmbientAudio = false,
}: SitePreloaderProps = {}): ReactElement | null {
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  const onFadeCompleteRef = useRef(onFadeComplete);
  onFadeCompleteRef.current = onFadeComplete;
  const devBlackCoverRef = useRef<ReturnType<typeof mountDevPostPreloaderBlackCover>>(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = 'hidden';

    const reduced = motionPrefs.reduced;

    const ambient =
      wormhole5AmbientAudio && !reduced && isWormhole5AmbientAudioRoute();

    tunnelStore.setState({ wormholeTunnelRenderPaused: true });
    prefetchLogoCoinCanvas();
    if (ambient) {
      warmWormhole5AmbientAudio();
    }

    const runFadeComplete = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tunnelStore.setState({ wormholeTunnelRenderPaused: false });
          const cover = devBlackCoverRef.current;
          if (!reduced && cover) {
            devBlackCoverRef.current = null;
            cover.fadeOut(() => onFadeCompleteRef.current?.());
            return;
          }
          onFadeCompleteRef.current?.();
        });
      });
    };

    mountTerminalPreloader({
      onGone: () => {
        if (!reduced) {
          devBlackCoverRef.current = mountDevPostPreloaderBlackCover();
        }
        onGoneRef.current?.();
      },
      onFadeComplete: runFadeComplete,
      reduced,
      autoAdvance: !ambient,
      autoAdvanceMs: 1800,
      timeScale: 1,
      enterToProceed: ambient,
      onEnterProceed: ambient ? armWormhole5AmbientFromEnter : undefined,
    });

    document.getElementById(NL_BOOT_CHROME_HIDE_STYLE_ID)?.remove();

    return () => {
      document.body.style.overflow = '';
      tunnelStore.setState({ wormholeTunnelRenderPaused: false });
      devBlackCoverRef.current?.teardown();
      devBlackCoverRef.current = null;
      if (wormhole5AmbientAudio) {
        teardownWormhole5Ambient();
      }
      unmountTerminalPreloader();
    };
  }, [wormhole5AmbientAudio]);

  return null;
}
