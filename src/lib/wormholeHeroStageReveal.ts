import { runStageReveal } from '@/lib/stageReveal';
import {
  wormholeHomeIntroFreezeTranslateZOnProduction,
  wormholeHomeIntroLogoEased,
} from '@/lib/wormholeHomeIntroEasing';
import {
  WORMHOLE5_INTRO_LOGO_START_TZ_PX,
  WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE,
  wormholeHomeMicroIntroDelayMs,
  wormholeHomeMicroIntroMs,
} from '@/lib/wormholePageConfig';
import { tunnelStore } from '@/tunnel/tunnelStore';

export type WormholeHeroStageRevealOpts = {
  /** When true, animates logo Z (production: via `--stage-reveal-progress`, frozen at 1). */
  introTranslateZ: boolean;
  /**
   * When true (default), ramps `wormholeHomeIntroCam01` with the logo. Home (`/`) sets false so
   * depth pullback drives the journey cam and this reveal is CSS coin fade/scale only.
   */
  driveIntroCam?: boolean;
};

function setIntroTranslateZMode(freezeAtProgress: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (freezeAtProgress) {
    root.dataset.nlIntroTz = 'progress';
    root.style.setProperty('--nl-logo-tz-start', `${WORMHOLE5_INTRO_LOGO_START_TZ_PX}px`);
    root.style.removeProperty('--nl-logo-tz');
  } else {
    delete root.dataset.nlIntroTz;
    root.style.removeProperty('--nl-logo-tz-start');
  }
}

function finalizeIntroTranslateZ(freezeAtProgress: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (freezeAtProgress) {
    root.style.setProperty('--stage-reveal-progress', '1');
    root.style.setProperty('--nl-logo-tz', '0px');
  } else {
    root.style.setProperty('--nl-logo-tz', '0px');
  }
}

/**
 * Hero intro aligned with STAGE_REVEAL.md. Tunnel leads via depth pullback; coin follows after
 * {@link wormholeHomeMicroIntroDelayMs} for {@link wormholeHomeMicroIntroMs}.
 */
export function runWormholeHeroStageReveal(
  opts: WormholeHeroStageRevealOpts,
): { cancel: () => void } {
  const driveIntroCam = opts.driveIntroCam ?? true;
  const freezeTzAtProgress =
    opts.introTranslateZ && wormholeHomeIntroFreezeTranslateZOnProduction();

  if (freezeTzAtProgress) {
    setIntroTranslateZMode(true);
  }

  let inner: { cancel: () => void } = { cancel: () => {} };
  let delayTimer: ReturnType<typeof setTimeout> | undefined;

  const startReveal = () => {
    inner = runStageReveal({
      durationMs: wormholeHomeMicroIntroMs(),
      scaleFrom: WORMHOLE_HOME_MICRO_INTRO_LOGO_START_SCALE,
      ease: wormholeHomeIntroLogoEased,
      onFrame(_linear, eased) {
        if (driveIntroCam) {
          tunnelStore.setState({ wormholeHomeIntroCam01: eased });
        }
        if (opts.introTranslateZ && !freezeTzAtProgress && typeof document !== 'undefined') {
          const tz = WORMHOLE5_INTRO_LOGO_START_TZ_PX * (1 - eased);
          document.documentElement.style.setProperty('--nl-logo-tz', `${tz}px`);
        }
      },
      onComplete() {
        if (driveIntroCam) {
          tunnelStore.setState({ wormholeHomeIntroCam01: 1 });
        }
        if (opts.introTranslateZ) {
          finalizeIntroTranslateZ(freezeTzAtProgress);
        }
      },
    });
  };

  const delayMs = wormholeHomeMicroIntroDelayMs();
  if (delayMs > 0) {
    delayTimer = setTimeout(startReveal, delayMs);
  } else {
    startReveal();
  }

  return {
    cancel: () => {
      if (delayTimer !== undefined) clearTimeout(delayTimer);
      inner.cancel();
      if (freezeTzAtProgress) {
        setIntroTranslateZMode(false);
      }
    },
  };
}
