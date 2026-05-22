import { clearStageReveal, initStageReveal, runStageReveal, type StageRevealOpts } from '@/lib/stageReveal';
import { clearPrismBreach, initPrismBreach, runPrismBreach, PRISM_BREACH_DURATION_MS } from '@/intros/prismBreach';
import { clearGhostEcho, initGhostEcho, runGhostEcho, GHOST_ECHO_DURATION_MS } from '@/intros/ghostEcho';
import { clearGravityWell, initGravityWell, runGravityWell, GRAVITY_WELL_DURATION_MS } from '@/intros/gravityWell';

export type IntroName = 'stage-reveal' | 'prism-breach' | 'ghost-echo' | 'gravity-well';

const STORAGE_KEY = 'nl-intro:active';
export const DEFAULT_INTRO: IntroName = 'stage-reveal';

const INTRO_IDS: IntroName[] = ['stage-reveal', 'prism-breach', 'ghost-echo', 'gravity-well'];

export function getActiveIntro(): IntroName {
  if (typeof window === 'undefined') return DEFAULT_INTRO;
  const stored = window.localStorage.getItem(STORAGE_KEY) as IntroName | null;
  if (stored && INTRO_IDS.includes(stored)) {
    return stored;
  }
  return DEFAULT_INTRO;
}

export function setActiveIntro(name: IntroName): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, name);
  window.dispatchEvent(new CustomEvent('nl-active-intro-changed', { detail: { name } }));
}

export function getIntroDurationMs(name: IntroName): number {
  switch (name) {
    case 'prism-breach':
      return PRISM_BREACH_DURATION_MS;
    case 'ghost-echo':
      return GHOST_ECHO_DURATION_MS;
    case 'gravity-well':
      return GRAVITY_WELL_DURATION_MS;
    default:
      return 760;
  }
}

type RegistryEntry = {
  init: (target?: HTMLElement) => void;
  run: (opts?: StageRevealOpts & { target?: HTMLElement; onComplete?: () => void }) => { cancel: () => void };
  clear: (target?: HTMLElement) => void;
};

const REGISTRY: Record<IntroName, RegistryEntry> = {
  'stage-reveal': {
    init: (t) => initStageReveal(t),
    run: (opts) => runStageReveal(opts ?? {}),
    clear: (t) => clearStageReveal(t),
  },
  'prism-breach': {
    init: (t) => initPrismBreach(t ?? document.documentElement),
    run: (opts) => runPrismBreach({ target: opts?.target, onComplete: opts?.onComplete }),
    clear: (t) => clearPrismBreach(t ?? document.documentElement),
  },
  'ghost-echo': {
    init: (t) => initGhostEcho(t ?? document.documentElement),
    run: (opts) => runGhostEcho({ target: opts?.target, onComplete: opts?.onComplete }),
    clear: (t) => clearGhostEcho(t ?? document.documentElement),
  },
  'gravity-well': {
    init: (t) => initGravityWell(t ?? document.documentElement),
    run: (opts) => runGravityWell({ target: opts?.target, onComplete: opts?.onComplete }),
    clear: (t) => clearGravityWell(t ?? document.documentElement),
  },
};

export function initActiveIntro(target?: HTMLElement): void {
  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  const active = getActiveIntro();
  (Object.entries(REGISTRY) as [IntroName, RegistryEntry][]).forEach(([name, mod]) => {
    if (name !== active) mod.clear(el);
  });
  REGISTRY[active].init(el);
}

export function runActiveIntro(opts: StageRevealOpts = {}): { cancel: () => void } {
  const active = getActiveIntro();
  return REGISTRY[active].run(opts);
}

export function clearAllIntros(target?: HTMLElement): void {
  const el = target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  (Object.values(REGISTRY) as RegistryEntry[]).forEach((mod) => mod.clear(el));
}
