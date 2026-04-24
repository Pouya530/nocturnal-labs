const listeners = new Set<() => void>();

let reduced = false;
let mq: MediaQueryList | null = null;

function syncFromMatchMedia(): void {
  reduced = mq?.matches ?? false;
  listeners.forEach((fn) => {
    fn();
  });
}

function ensureInit(): void {
  if (typeof window === 'undefined' || mq) return;
  mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced = mq.matches;
  mq.addEventListener('change', syncFromMatchMedia);
}

/**
 * Live `prefers-reduced-motion` flag plus subscriber API.
 */
export const motionPrefs = {
  get reduced(): boolean {
    ensureInit();
    return reduced;
  },
  subscribe(listener: () => void): () => void {
    ensureInit();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
