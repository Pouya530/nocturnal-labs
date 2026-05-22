/** GRAVITY WELL intro — THREE_INTRO_SEQUENCES.md */

const DURATION_MS = 1200;

function easeOutQuint(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 5;
}

function easeOutBack(t: number, overshoot = 1.5): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 + (overshoot + 1) * (x - 1) ** 3 + overshoot * (x - 1) ** 2;
}

let activeRaf = 0;
let isRunning = false;

export function initGravityWell(target: HTMLElement = document.documentElement): void {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    target.style.setProperty('--gravity-subject-scale', '1');
    target.style.setProperty('--gravity-subject-opacity', '1');
    target.style.setProperty('--gravity-bloom-size', '0px');
    target.style.setProperty('--gravity-bloom-opacity', '0');
    target.style.setProperty('--gravity-edge-distort', '0px');
    target.style.setProperty('--gravity-vignette-opacity', '0');
    target.style.setProperty('--gravity-bloom-hue', '280');
    return;
  }
  target.style.setProperty('--gravity-subject-scale', '0.02');
  target.style.setProperty('--gravity-subject-opacity', '1');
  target.style.setProperty('--gravity-bloom-size', '0px');
  target.style.setProperty('--gravity-bloom-opacity', '0');
  target.style.setProperty('--gravity-edge-distort', '0px');
  target.style.setProperty('--gravity-vignette-opacity', '0');
  target.style.setProperty('--gravity-bloom-hue', '320');
}

export type GravityWellRunOpts = {
  target?: HTMLElement;
  onComplete?: () => void;
};

export function runGravityWell(opts: GravityWellRunOpts = {}): { cancel: () => void } {
  if (isRunning) return { cancel: () => {} };
  const target = opts.target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return { cancel: () => {} };

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    initGravityWell(target);
    opts.onComplete?.();
    return { cancel: () => {} };
  }

  isRunning = true;
  const t0 = performance.now();

  const step = (now: number) => {
    const linear = Math.min(1, (now - t0) / DURATION_MS);

    let scale: number;
    if (linear < 0.6) {
      const t = linear / 0.6;
      scale = 0.02 + (0.8 - 0.02) * easeOutQuint(t);
    } else {
      const t = (linear - 0.6) / 0.4;
      scale = 0.8 + (1.05 - 0.8) * easeOutBack(t, 1.5);
      if (linear > 0.85) {
        const settleT = (linear - 0.85) / 0.15;
        scale = 1.05 - (1.05 - 1.0) * settleT;
      }
    }
    target.style.setProperty('--gravity-subject-scale', String(scale));

    let bloomSize = 0;
    let bloomOp = 0;
    if (linear < 0.3) {
      const t = linear / 0.3;
      bloomSize = 200 * easeOutQuint(t);
      bloomOp = easeOutQuint(t);
    } else {
      const t = (linear - 0.3) / 0.7;
      bloomSize = 200 * (1 - t * 0.5);
      bloomOp = 1 - easeOutQuint(t);
    }
    target.style.setProperty('--gravity-bloom-size', `${bloomSize}px`);
    target.style.setProperty('--gravity-bloom-opacity', String(bloomOp));

    const hue = 320 - linear * 260;
    target.style.setProperty('--gravity-bloom-hue', String(hue));

    const distortPhase = Math.sin(linear * Math.PI);
    target.style.setProperty('--gravity-edge-distort', `${distortPhase * 8}px`);

    target.style.setProperty('--gravity-vignette-opacity', String(distortPhase * 0.6));

    if (linear < 1) {
      activeRaf = requestAnimationFrame(step);
    } else {
      target.style.setProperty('--gravity-subject-scale', '1');
      target.style.setProperty('--gravity-subject-opacity', '1');
      target.style.setProperty('--gravity-bloom-size', '0px');
      target.style.setProperty('--gravity-bloom-opacity', '0');
      target.style.setProperty('--gravity-edge-distort', '0px');
      target.style.setProperty('--gravity-vignette-opacity', '0');
      isRunning = false;
      opts.onComplete?.();
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

export function clearGravityWell(target: HTMLElement = document.documentElement): void {
  [
    '--gravity-subject-scale',
    '--gravity-subject-opacity',
    '--gravity-bloom-size',
    '--gravity-bloom-opacity',
    '--gravity-bloom-hue',
    '--gravity-edge-distort',
    '--gravity-vignette-opacity',
  ].forEach((v) => target.style.removeProperty(v));
}

export const GRAVITY_WELL_DURATION_MS = DURATION_MS;
