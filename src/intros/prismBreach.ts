/** PRISM BREACH intro — THREE_INTRO_SEQUENCES.md */

const DURATION_MS = 1000;
const OFFSET_START_PX = 24;

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function easeOutBack(t: number, overshoot = 1.7): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 + (overshoot + 1) * (x - 1) ** 3 + overshoot * (x - 1) ** 2;
}

let activeRaf = 0;
let isRunning = false;

export function initPrismBreach(target: HTMLElement = document.documentElement): void {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    target.style.setProperty('--prism-offset-r-x', '0px');
    target.style.setProperty('--prism-offset-g-x', '0px');
    target.style.setProperty('--prism-ghost-opacity', '0');
    target.style.setProperty('--prism-subject-opacity', '1');
    target.style.setProperty('--prism-subject-scale', '1');
    target.style.setProperty('--prism-scanline-x', '-100vw');
    target.style.setProperty('--prism-scanline-opacity', '0');
    return;
  }
  target.style.setProperty('--prism-offset-r-x', `${OFFSET_START_PX}px`);
  target.style.setProperty('--prism-offset-g-x', `${-OFFSET_START_PX}px`);
  target.style.setProperty('--prism-ghost-opacity', '0.4');
  target.style.setProperty('--prism-subject-opacity', '0');
  target.style.setProperty('--prism-subject-scale', '0.9');
  target.style.setProperty('--prism-scanline-x', '-100vw');
  target.style.setProperty('--prism-scanline-opacity', '0');
}

export type PrismBreachRunOpts = {
  target?: HTMLElement;
  onComplete?: () => void;
};

export function runPrismBreach(opts: PrismBreachRunOpts = {}): { cancel: () => void } {
  if (isRunning) return { cancel: () => {} };
  const target = opts.target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return { cancel: () => {} };

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    initPrismBreach(target);
    opts.onComplete?.();
    return { cancel: () => {} };
  }

  isRunning = true;
  const t0 = performance.now();

  const step = (now: number) => {
    const linear = Math.min(1, (now - t0) / DURATION_MS);

    const convergeT = Math.min(1, linear / 0.6);
    const convergeEased = easeOutCubic(convergeT);

    const offset = OFFSET_START_PX * (1 - convergeEased);
    target.style.setProperty('--prism-offset-r-x', `${offset}px`);
    target.style.setProperty('--prism-offset-g-x', `${-offset}px`);

    target.style.setProperty('--prism-ghost-opacity', String(0.4 * (1 - convergeEased)));

    target.style.setProperty('--prism-subject-opacity', String(convergeEased));

    const scaleProgress = easeOutBack(linear, 1.7);
    const scale = 0.9 + (1 - 0.9) * scaleProgress;
    target.style.setProperty('--prism-subject-scale', String(scale));

    const scanX = -100 + linear * 200;
    target.style.setProperty('--prism-scanline-x', `${scanX}vw`);
    const scanOp = Math.sin(linear * Math.PI);
    target.style.setProperty('--prism-scanline-opacity', String(scanOp * 0.9));

    if (linear < 1) {
      activeRaf = requestAnimationFrame(step);
    } else {
      target.style.setProperty('--prism-offset-r-x', '0px');
      target.style.setProperty('--prism-offset-g-x', '0px');
      target.style.setProperty('--prism-ghost-opacity', '0');
      target.style.setProperty('--prism-subject-opacity', '1');
      target.style.setProperty('--prism-subject-scale', '1');
      target.style.setProperty('--prism-scanline-opacity', '0');
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

export function clearPrismBreach(target: HTMLElement = document.documentElement): void {
  [
    '--prism-offset-r-x',
    '--prism-offset-g-x',
    '--prism-ghost-opacity',
    '--prism-subject-opacity',
    '--prism-subject-scale',
    '--prism-scanline-x',
    '--prism-scanline-opacity',
  ].forEach((v) => target.style.removeProperty(v));
}

export const PRISM_BREACH_DURATION_MS = DURATION_MS;
