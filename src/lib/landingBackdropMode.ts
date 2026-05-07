export type LandingBackdropMode =
  | 'tunnel'
  | 'original'
  | 'vortex'
  | 'vortext2'
  | 'vortext3'
  | 'vortextunnel';

const STORAGE_KEY = 'nl-backdrop-mode';

export function readStoredLandingBackdropMode(): LandingBackdropMode | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (
      v === 'tunnel' ||
      v === 'original' ||
      v === 'vortex' ||
      v === 'vortext2' ||
      v === 'vortext3' ||
      v === 'vortextunnel'
    )
      return v;
  } catch {
    /* private mode */
  }
  return null;
}

export function persistLandingBackdropMode(mode: LandingBackdropMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* */
  }
}

type ModeListener = () => void;
const modeListeners = new Set<ModeListener>();
let activeMode: LandingBackdropMode = 'original';

export function setActiveLandingBackdropMode(mode: LandingBackdropMode): void {
  activeMode = mode;
  for (const l of modeListeners) l();
}

export function getActiveLandingBackdropMode(): LandingBackdropMode {
  return activeMode;
}

export function subscribeActiveLandingBackdropMode(listener: ModeListener): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}
