/**
 * Stage-reveal intro (STAGE_REVEAL.md) — three CSS vars on `document.documentElement` by default.
 */

export type StageRevealOpts = {
  target?: HTMLElement;
  onComplete?: () => void;
  onFrame?: (linearProgress: number, easedProgress: number) => void;
  durationMs?: number;
  /** Maps linear progress (0–1) to eased progress for scale/opacity; default ease-out cubic. */
  ease?: (linear: number) => number;
  scaleFrom?: number;
};

const DEFAULTS = {
  durationMs: 760,
  scaleFrom: 0.58,
};

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

let activeRaf = 0;
let isRunning = false;

export function runStageReveal(opts: StageRevealOpts = {}): { cancel: () => void } {
  const {
    target,
    onComplete,
    onFrame,
    durationMs = DEFAULTS.durationMs,
    ease = easeOutCubic,
    scaleFrom = DEFAULTS.scaleFrom,
  } = opts;

  if (isRunning) {
    return { cancel: () => {} };
  }

  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) {
    return { cancel: () => {} };
  }

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    el.style.setProperty('--stage-reveal-progress', '1');
    el.style.setProperty('--stage-reveal-scale', '1');
    el.style.setProperty('--stage-reveal-opacity', '1');
    onComplete?.();
    return { cancel: () => {} };
  }

  isRunning = true;
  const t0 = performance.now();

  const step = (now: number) => {
    const linear = Math.min(1, (now - t0) / durationMs);
    const eased = ease(linear);

    el.style.setProperty('--stage-reveal-progress', String(eased));

    const scale = scaleFrom + (1 - scaleFrom) * eased;
    el.style.setProperty('--stage-reveal-scale', String(scale));

    /* Fade in lock-step with scale (same eased curve) so the hero reads as one motion. */
    el.style.setProperty('--stage-reveal-opacity', String(eased));

    onFrame?.(linear, eased);

    if (linear < 1) {
      activeRaf = requestAnimationFrame(step);
    } else {
      el.style.setProperty('--stage-reveal-progress', '1');
      el.style.setProperty('--stage-reveal-scale', '1');
      el.style.setProperty('--stage-reveal-opacity', '1');
      isRunning = false;
      onComplete?.();
    }
  };

  activeRaf = requestAnimationFrame(step);

  return {
    cancel: () => {
      cancelAnimationFrame(activeRaf);
      isRunning = false;
    },
  };
}

export function initStageReveal(target?: HTMLElement, scaleFrom = DEFAULTS.scaleFrom): void {
  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    el.style.setProperty('--stage-reveal-progress', '1');
    el.style.setProperty('--stage-reveal-scale', '1');
    el.style.setProperty('--stage-reveal-opacity', '1');
  } else {
    el.style.setProperty('--stage-reveal-progress', '0');
    el.style.setProperty('--stage-reveal-scale', String(scaleFrom));
    el.style.setProperty('--stage-reveal-opacity', '0');
  }
}

export function clearStageReveal(target?: HTMLElement): void {
  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  el.style.removeProperty('--stage-reveal-progress');
  el.style.removeProperty('--stage-reveal-scale');
  el.style.removeProperty('--stage-reveal-opacity');
}
