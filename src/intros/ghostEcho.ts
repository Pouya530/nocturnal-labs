/** GHOST ECHO intro — THREE_INTRO_SEQUENCES.md */

const DURATION_MS = 1100;
const GHOST_COUNT = 5;
const ARC_RADIUS = 80;

const GHOST_POSITIONS = [
  { angle: (-150 * Math.PI) / 180, r: ARC_RADIUS },
  { angle: (-30 * Math.PI) / 180, r: ARC_RADIUS },
  { angle: (60 * Math.PI) / 180, r: ARC_RADIUS },
  { angle: (150 * Math.PI) / 180, r: ARC_RADIUS },
  { angle: 0, r: 0 },
];

const GHOST_PHASE_OFFSETS = [0.0, 0.18, 0.36, 0.54, 0.72];

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

let activeRaf = 0;
let isRunning = false;

export function initGhostEcho(target: HTMLElement = document.documentElement): void {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    for (let i = 0; i < GHOST_COUNT; i++) {
      target.style.setProperty(`--ghost-x-${i}`, '0px');
      target.style.setProperty(`--ghost-y-${i}`, '0px');
      target.style.setProperty(`--ghost-blur-${i}`, '0px');
      target.style.setProperty(`--ghost-opacity-${i}`, '0');
    }
    target.style.setProperty('--ghost-subject-opacity', '1');
    target.style.setProperty('--ghost-subject-scale', '1');
    return;
  }
  for (let i = 0; i < GHOST_COUNT; i++) {
    const pos = GHOST_POSITIONS[i];
    target.style.setProperty(`--ghost-x-${i}`, `${Math.cos(pos.angle) * pos.r}px`);
    target.style.setProperty(`--ghost-y-${i}`, `${Math.sin(pos.angle) * pos.r}px`);
    target.style.setProperty(`--ghost-blur-${i}`, '8px');
    target.style.setProperty(`--ghost-opacity-${i}`, '0.25');
  }
  target.style.setProperty('--ghost-subject-opacity', '0');
  target.style.setProperty('--ghost-subject-scale', '0.92');
}

export type GhostEchoRunOpts = {
  target?: HTMLElement;
  onComplete?: () => void;
};

export function runGhostEcho(opts: GhostEchoRunOpts = {}): { cancel: () => void } {
  if (isRunning) return { cancel: () => {} };
  const target = opts.target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return { cancel: () => {} };

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    initGhostEcho(target);
    opts.onComplete?.();
    return { cancel: () => {} };
  }

  isRunning = true;
  const t0 = performance.now();

  const step = (now: number) => {
    const linear = Math.min(1, (now - t0) / DURATION_MS);
    const eased = easeOutCubic(linear);

    const convT = Math.min(1, linear / 0.7);
    const convEased = easeOutCubic(convT);

    for (let i = 0; i < GHOST_COUNT; i++) {
      const pos = GHOST_POSITIONS[i];
      const r = pos.r * (1 - convEased);
      target.style.setProperty(`--ghost-x-${i}`, `${Math.cos(pos.angle) * r}px`);
      target.style.setProperty(`--ghost-y-${i}`, `${Math.sin(pos.angle) * r}px`);

      const blur = 8 * (1 - convEased);
      target.style.setProperty(`--ghost-blur-${i}`, `${blur}px`);

      let opacity = 0;
      if (linear < 0.7) {
        const flicker = 0.5 + 0.5 * Math.sin((linear * 4 + GHOST_PHASE_OFFSETS[i]) * Math.PI);
        opacity = 0.25 * flicker * (1 - convEased * 0.3);
      } else {
        const phaseOutT = (linear - 0.7) / 0.3;
        opacity = 0.25 * (1 - phaseOutT);
      }
      target.style.setProperty(`--ghost-opacity-${i}`, String(opacity));
    }

    let subjectOp = 0;
    if (linear > 0.7) {
      subjectOp = easeOutCubic((linear - 0.7) / 0.3);
    }
    target.style.setProperty('--ghost-subject-opacity', String(subjectOp));

    target.style.setProperty('--ghost-subject-scale', String(0.92 + 0.08 * eased));

    if (linear < 1) {
      activeRaf = requestAnimationFrame(step);
    } else {
      for (let i = 0; i < GHOST_COUNT; i++) {
        target.style.setProperty(`--ghost-x-${i}`, '0px');
        target.style.setProperty(`--ghost-y-${i}`, '0px');
        target.style.setProperty(`--ghost-blur-${i}`, '0px');
        target.style.setProperty(`--ghost-opacity-${i}`, '0');
      }
      target.style.setProperty('--ghost-subject-opacity', '1');
      target.style.setProperty('--ghost-subject-scale', '1');
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

export function clearGhostEcho(target: HTMLElement = document.documentElement): void {
  for (let i = 0; i < GHOST_COUNT; i++) {
    target.style.removeProperty(`--ghost-x-${i}`);
    target.style.removeProperty(`--ghost-y-${i}`);
    target.style.removeProperty(`--ghost-blur-${i}`);
    target.style.removeProperty(`--ghost-opacity-${i}`);
  }
  target.style.removeProperty('--ghost-subject-opacity');
  target.style.removeProperty('--ghost-subject-scale');
}

export const GHOST_ECHO_DURATION_MS = DURATION_MS;
