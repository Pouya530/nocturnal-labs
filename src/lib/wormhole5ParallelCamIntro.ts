import { WORMHOLE5_INTRO_LOGO_START_TZ_PX } from '@/lib/wormholePageConfig';
import { tunnelStore } from '@/tunnel/tunnelStore';

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** Journey coin cam + `--nl-logo-tz` in sync with alternate lab intros (THREE_INTRO_SEQUENCES.md). */
export function runWormhole5ParallelCamIntro(durationMs: number): { cancel: () => void } {
  const startTzPx = WORMHOLE5_INTRO_LOGO_START_TZ_PX;
  let raf = 0;
  const t0 = performance.now();

  const step = (now: number) => {
    const u = Math.min(1, (now - t0) / durationMs);
    const eased = easeOutCubic(u);
    tunnelStore.setState({ wormholeHomeIntroCam01: eased });
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--nl-logo-tz', `${startTzPx * (1 - eased)}px`);
    }
    if (u < 1) {
      raf = requestAnimationFrame(step);
    } else {
      tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--nl-logo-tz', '0px');
      }
    }
  };

  raf = requestAnimationFrame(step);
  return {
    cancel: () => {
      cancelAnimationFrame(raf);
    },
  };
}
