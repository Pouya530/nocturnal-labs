import { isCoarseOrTouchPrimaryViewport, isIOSLike } from '@/lib/webglMobilePrefs';

/**
 * Home `/` + `/wormhole5` ambient loop.
 * Full: `public/audio/sub-bass-silence.mp3` (desktop seeks past intro).
 * Trimmed: `public/audio/sub-bass-silence-trimmed.mp3` (mobile plays from 0, no seek).
 */

export const WORMHOLE5_AMBIENT_AUDIO_SRC = '/audio/sub-bass-silence.mp3';

/** Same mix from ~4s in — used on touch / iOS to avoid runtime seek stalls. */
export const WORMHOLE5_AMBIENT_AUDIO_SRC_TRIM = '/audio/sub-bass-silence-trimmed.mp3';

const TARGET_VOLUME = 0.58;
const FADE_IN_MS = 3200;
/** Desktop full file — skip quiet intro via runtime seek (seconds). */
export const WORMHOLE5_AMBIENT_START_OFFSET_SEC = 4;

export function wormhole5AmbientUsesTrimmedFile(): boolean {
  if (typeof window === 'undefined') return false;
  return isIOSLike() || isCoarseOrTouchPrimaryViewport();
}

export function wormhole5AmbientAudioSrc(): string {
  return wormhole5AmbientUsesTrimmedFile()
    ? WORMHOLE5_AMBIENT_AUDIO_SRC_TRIM
    : WORMHOLE5_AMBIENT_AUDIO_SRC;
}

/** `0` on trimmed / touch; {@link WORMHOLE5_AMBIENT_START_OFFSET_SEC} on desktop full file. */
export function wormhole5AmbientStartOffsetSec(): number {
  if (wormhole5AmbientUsesTrimmedFile()) return 0;
  return WORMHOLE5_AMBIENT_START_OFFSET_SEC;
}
/** Volume ramp after coin reveal (ms). */
export const WORMHOLE5_AMBIENT_QUICK_FADE_MS = 1000;

const listeners = new Set<() => void>();

let audio: HTMLAudioElement | null = null;
let gestureUnlocked = false;
let playing = false;
let fadeRaf = 0;

function emit(): void {
  for (const l of listeners) l();
}

function cancelFade(): void {
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(wormhole5AmbientAudioSrc());
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.addEventListener('play', () => {
      playing = true;
      emit();
    });
    audio.addEventListener('pause', () => {
      playing = false;
      emit();
    });
    audio.addEventListener('ended', () => {
      playing = false;
      emit();
    });
    const loopSkipSec = wormhole5AmbientStartOffsetSec();
    if (loopSkipSec > 0) {
      audio.addEventListener('timeupdate', () => {
        if (audio && audio.currentTime < loopSkipSec - 0.05) {
          audio.currentTime = loopSkipSec;
        }
      });
    }
  }
  return audio;
}

function seekAmbientToStartOffset(a: HTMLAudioElement, offsetSec: number): void {
  if (offsetSec <= 0) return;
  const seek = () => {
    a.currentTime = offsetSec;
  };
  if (a.readyState >= 1) {
    seek();
    return;
  }
  a.addEventListener('loadedmetadata', seek, { once: true });
}

function fadeVolumeTo(target: number, durationMs: number, onDone?: () => void): void {
  const a = audio;
  if (!a) return;
  cancelFade();
  const from = a.volume;
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / durationMs);
    const eased = t * t * (3 - 2 * t);
    a.volume = from + (target - from) * eased;
    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
    } else {
      fadeRaf = 0;
      onDone?.();
    }
  };
  fadeRaf = requestAnimationFrame(tick);
}

export function isWormhole5AmbientAudioRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/' || path === '/wormhole5' || path === '/wormhole5/';
}

export function subscribeWormhole5AmbientAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isWormhole5AmbientGestureUnlocked(): boolean {
  return gestureUnlocked;
}

export function isWormhole5AmbientPlaying(): boolean {
  const a = audio;
  return playing && !!a && !a.paused;
}

/** Preloader Enter — unlock autoplay (silent play/pause) before dismiss. */
export function armWormhole5AmbientFromEnter(): void {
  const a = getAudio();
  if (!a) return;
  gestureUnlocked = true;
  emit();
  void a
    .play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = 0;
      playing = false;
      emit();
    })
    .catch(() => {
      gestureUnlocked = false;
      emit();
    });
}

/** After preloader fade — play loop and fade in volume (legacy fixed duration). */
export function startWormhole5AmbientAfterPreloader(): void {
  startWormhole5AmbientSyncedFade({ durationMs: FADE_IN_MS });
}

export type Wormhole5AmbientSyncFadeOpts = {
  delayMs?: number;
  durationMs: number;
  /** Maps linear progress 0–1 to volume curve; default smoothstep. */
  ease?: (linear: number) => number;
  /** Seek before play; default {@link WORMHOLE5_AMBIENT_START_OFFSET_SEC}. */
  startOffsetSec?: number;
};

let syncDelayTimer: ReturnType<typeof setTimeout> | undefined;
let syncFadeRaf = 0;

function clearSyncFade(): void {
  if (syncDelayTimer !== undefined) {
    clearTimeout(syncDelayTimer);
    syncDelayTimer = undefined;
  }
  if (syncFadeRaf) {
    cancelAnimationFrame(syncFadeRaf);
    syncFadeRaf = 0;
  }
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Fade in with hero coin stage-reveal timing (delay + duration + ease). */
export function startWormhole5AmbientSyncedFade(opts: Wormhole5AmbientSyncFadeOpts): () => void {
  clearSyncFade();
  cancelFade();

  if (!gestureUnlocked) return () => {};
  const a = getAudio();
  if (!a) return () => {};

  const delayMs = opts.delayMs ?? 0;
  const durationMs = Math.max(1, opts.durationMs);
  const ease = opts.ease ?? smoothstep;
  const startOffsetSec = opts.startOffsetSec ?? wormhole5AmbientStartOffsetSec();

  const begin = () => {
    syncDelayTimer = undefined;
    a.volume = 0;
    seekAmbientToStartOffset(a, startOffsetSec);
    void a.play().then(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const linear = Math.min(1, (now - t0) / durationMs);
        a.volume = TARGET_VOLUME * ease(linear);
        if (linear < 1) {
          syncFadeRaf = requestAnimationFrame(tick);
        } else {
          a.volume = TARGET_VOLUME;
          syncFadeRaf = 0;
        }
      };
      syncFadeRaf = requestAnimationFrame(tick);
    }).catch(() => {
      playing = false;
      emit();
    });
  };

  if (delayMs > 0) {
    syncDelayTimer = setTimeout(begin, delayMs);
  } else {
    begin();
  }

  return clearSyncFade;
}

/** Reduced motion — full volume immediately after preloader. */
export function startWormhole5AmbientImmediate(): void {
  clearSyncFade();
  cancelFade();
  if (!gestureUnlocked) return;
  const a = getAudio();
  if (!a) return;
  a.volume = TARGET_VOLUME;
  seekAmbientToStartOffset(a, wormhole5AmbientStartOffsetSec());
  void a.play().catch(() => {
    playing = false;
    emit();
  });
}

export function toggleWormhole5AmbientPlayback(): void {
  const a = getAudio();
  if (!a) return;
  if (a.paused) {
    gestureUnlocked = true;
    cancelFade();
    void a.play().then(() => {
      fadeVolumeTo(TARGET_VOLUME, 900);
    }).catch(() => {});
    return;
  }
  cancelFade();
  a.pause();
}

export function pauseWormhole5Ambient(): void {
  cancelFade();
  audio?.pause();
}

export function teardownWormhole5Ambient(): void {
  clearSyncFade();
  cancelFade();
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
  gestureUnlocked = false;
  playing = false;
  emit();
}
