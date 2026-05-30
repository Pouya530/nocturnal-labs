import { isLocalhostHostname } from '@/lib/isLocalhost';
import { isCoarseOrTouchPrimaryViewport, isIOSLike } from '@/lib/webglMobilePrefs';

/**
 * Home `/` + `/wormhole5` + `/wormhole20` ambient loop.
 * Production home `/`: `nc-bass-baptism` (+ trimmed). Lab `/wormhole5` on prod keeps legacy sub-bass.
 * Localhost dev: Bass Baptism on all ambient routes.
 */

export const WORMHOLE5_AMBIENT_AUDIO_SRC = '/audio/sub-bass-silence.mp3';

/** Same mix from ~4s in — used on touch / iOS to avoid runtime seek stalls. */
export const WORMHOLE5_AMBIENT_AUDIO_SRC_TRIM = '/audio/sub-bass-silence-trimmed.mp3';

/** Stripped `NC_Bass-Baptism.mp3` — production home `/` + localhost dev. */
export const WORMHOLE5_AMBIENT_AUDIO_SRC_BASS_BAPTISM = '/audio/nc-bass-baptism.mp3';

export const WORMHOLE5_AMBIENT_AUDIO_SRC_BASS_BAPTISM_TRIM =
  '/audio/nc-bass-baptism-trimmed.mp3';

/** Production home index — always Bass Baptism (labs.nocturnal.cloud `/`). */
export function isWormholeHomeIndexRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/' || path === '';
}

export function wormhole5AmbientUsesBassBaptismTrack(): boolean {
  if (typeof window === 'undefined') return false;
  if (isWormholeHomeIndexRoute()) return true;
  return isLocalhostHostname(window.location.hostname);
}

const TARGET_VOLUME = 0.58;
const FADE_IN_MS = 3200;
/** Desktop full file — skip quiet intro via runtime seek (seconds). */
export const WORMHOLE5_AMBIENT_START_OFFSET_SEC = 4;

export function wormhole5AmbientUsesTrimmedFile(): boolean {
  if (typeof window === 'undefined') return false;
  return isIOSLike() || isCoarseOrTouchPrimaryViewport();
}

export function wormhole5AmbientAudioSrc(): string {
  const bassBaptism = wormhole5AmbientUsesBassBaptismTrack();
  if (wormhole5AmbientUsesTrimmedFile()) {
    return bassBaptism
      ? WORMHOLE5_AMBIENT_AUDIO_SRC_BASS_BAPTISM_TRIM
      : WORMHOLE5_AMBIENT_AUDIO_SRC_TRIM;
  }
  return bassBaptism ? WORMHOLE5_AMBIENT_AUDIO_SRC_BASS_BAPTISM : WORMHOLE5_AMBIENT_AUDIO_SRC;
}

function ambientSrcAbsolute(): string {
  return new URL(wormhole5AmbientAudioSrc(), window.location.origin).href;
}

/** Keep singleton `<audio>` on the resolved track when route/host changes. */
function syncAmbientElementSrc(el: HTMLAudioElement): void {
  const nextAbs = ambientSrcAbsolute();
  if (el.src === nextAbs) return;
  el.pause();
  el.src = wormhole5AmbientAudioSrc();
  el.load();
  el.volume = 0;
  playing = false;
  emit();
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
let ambientLoading = false;
let fadeRaf = 0;
let lastToggleAt = 0;
const TOGGLE_DEBOUNCE_MS = 200;

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
    const el = new Audio(wormhole5AmbientAudioSrc());
    audio = el;
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
    void import('@/audio/wormholeAmbientEqualizer').then((m) =>
      m.wormholeAmbientEqualizerOnAudioElementReady(el),
    );
    const loopSkipSec = wormhole5AmbientStartOffsetSec();
    if (loopSkipSec > 0) {
      audio.addEventListener('timeupdate', () => {
        if (audio && audio.currentTime < loopSkipSec - 0.05) {
          audio.currentTime = loopSkipSec;
        }
      });
    }
  } else {
    syncAmbientElementSrc(audio);
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

export function isWormhole20LabRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/wormhole20' || path === '/wormhole20/';
}

export function isWormhole5AmbientAudioRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return (
    path === '/' ||
    path === '/wormhole5' ||
    path === '/wormhole5/' ||
    isWormhole20LabRoute()
  );
}

/** Shared `<audio>` element for ambient routes (analyser hookup on wormhole20). */
export function getWormhole5AmbientAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  return audio;
}

export function subscribeWormhole5AmbientAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isWormhole5AmbientGestureUnlocked(): boolean {
  return gestureUnlocked;
}

/** UI + monitors — derive from the element only; internal `playing` can desync from `paused` on WebKit. */
export function isWormhole5AmbientPlaying(): boolean {
  const a = audio;
  return !!a && !a.paused;
}

/** True while a user-initiated play is waiting on the element to start (first buffer). */
export function isWormhole5AmbientLoading(): boolean {
  return ambientLoading;
}

/** Julia debug sync — `currentTime` in seconds, or `null` if the element is not created yet. */
export function getWormhole5AmbientPlaybackTime(): number | null {
  if (!audio) return null;
  const t = audio.currentTime;
  return Number.isFinite(t) ? t : null;
}

export type WormholeJuliaAnimTime = {
  /** Shader + helix/sky animation clock (audio×rate when synced, else Three.js elapsed). */
  juliaTime: number;
  audioSec: number | null;
  /** True when uTime is driven from MP3 `currentTime` (sync on + element ready). */
  synced: boolean;
};

/**
 * Single source for Julia `uTime` — used by {@link JuliaWormholeBackdrop} and tunnel debug monitor.
 * When sync is on, optionally warms the audio element so localhost debug works before first play.
 */
export function resolveWormholeJuliaAnimTime(opts: {
  syncEnabled: boolean;
  syncRate: number;
  clockElapsed: number;
  warmAudio?: boolean;
}): WormholeJuliaAnimTime {
  const { syncEnabled, syncRate, clockElapsed, warmAudio } = opts;
  if (warmAudio && syncEnabled) warmWormhole5AmbientAudio();
  const audioSec = getWormhole5AmbientPlaybackTime();
  if (syncEnabled && audioSec != null) {
    return {
      juliaTime: audioSec * Math.max(0.05, syncRate),
      audioSec,
      synced: true,
    };
  }
  return { juliaTime: clockElapsed, audioSec, synced: false };
}

/** Same formula as {@link JuliaWormholeBackdrop} — for tunnel debug monitor. */
export function computeWormhole5JuliaShaderTimes(
  syncEnabled: boolean,
  syncRate: number,
  clockElapsed = 0,
): {
  audioSec: number | null;
  uTime: number | null;
  skyUTime: number | null;
  synced: boolean;
} {
  const resolved = resolveWormholeJuliaAnimTime({
    syncEnabled,
    syncRate,
    clockElapsed,
    warmAudio: syncEnabled,
  });
  if (!resolved.synced) {
    return { audioSec: resolved.audioSec, uTime: null, skyUTime: null, synced: false };
  }
  return {
    audioSec: resolved.audioSec,
    uTime: resolved.juliaTime,
    skyUTime: resolved.juliaTime * 0.4,
    synced: true,
  };
}

/**
 * Create/load the ambient element during boot (before ENTER) so the click path only unlocks playback.
 */
export function warmWormhole5AmbientAudio(): void {
  if (!isWormhole5AmbientAudioRoute()) return;
  getAudio();
}

/** Preloader Enter — unlock autoplay (silent play/pause) before dismiss. */
export function armWormhole5AmbientFromEnter(): void {
  warmWormhole5AmbientAudio();
  const a = audio;
  if (!a) return;
  gestureUnlocked = true;
  emit();
  if (isWormhole20LabRoute()) {
    void import('@/audio/wormholeAmbientEqualizer').then((m) => m.resumeWormholeAmbientAudioContext());
  }
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
      if (isWormhole20LabRoute()) {
        void import('@/audio/wormholeAmbientEqualizer').then((m) =>
          m.resumeWormholeAmbientAudioContext(),
        );
      }
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
  const now = performance.now();
  if (now - lastToggleAt < TOGGLE_DEBOUNCE_MS) return;
  lastToggleAt = now;

  const a = getAudio();
  if (!a) return;
  clearSyncFade();
  cancelFade();

  if (!a.paused) {
    ambientLoading = false;
    a.pause();
    playing = false;
    emit();
    /* WebKit sometimes updates `paused` after the current task — second tick refreshes nav UI. */
    requestAnimationFrame(() => emit());
    return;
  }

  gestureUnlocked = true;
  ambientLoading = true;
  emit();
  if (a.volume < 0.01) {
    a.volume = 0;
  }
  void a
    .play()
    .then(() => {
      ambientLoading = false;
      playing = true;
      emit();
      requestAnimationFrame(() => emit());
      fadeVolumeTo(TARGET_VOLUME, 900);
    })
    .catch(() => {
      ambientLoading = false;
      playing = false;
      emit();
    });
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
  ambientLoading = false;
  emit();
}
