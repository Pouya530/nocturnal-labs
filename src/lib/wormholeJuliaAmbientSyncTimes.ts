import {
  getWormhole5AmbientPlaybackTime,
  warmWormhole5AmbientAudio,
} from '@/audio/wormhole5AmbientAudio';

/** Wormhole5 helix lab — matches {@link JuliaWormholeBackdrop} `helixSpinT` (non-wormhole2 ribbon). */
export const WORMHOLE_JULIA_HELIX_SPIN_T = 0.18;

export const WORMHOLE_JULIA_PATTERN_SYNC_RATE_MAX = 3;
export const WORMHOLE_JULIA_HELIX_SPIN_RATE_MAX = 3;

export type WormholeJuliaAmbientSyncTargetState = {
  wormholeDebugJuliaAmbientSync: boolean;
  wormholeDebugJuliaAmbientSyncRate: number;
  wormholeDebugJuliaAmbientSyncShaders: boolean;
  wormholeDebugJuliaAmbientSyncHelixSpin: boolean;
  wormholeDebugJuliaAmbientSyncStars: boolean;
  wormholeDebugJuliaHelixSpinRate: number;
  wormholeDebugJuliaHelixSpinAudioSync: boolean;
};

/** Production home + `/wormhole5` — all targets MP3-synced; pattern 1.5×, slow helix spin 0.25×. */
export const WORMHOLE_JULIA_AMBIENT_SYNC_PRESET_DEFAULT: WormholeJuliaAmbientSyncTargetState = {
  wormholeDebugJuliaAmbientSync: true,
  wormholeDebugJuliaAmbientSyncRate: 1.5,
  wormholeDebugJuliaAmbientSyncShaders: true,
  wormholeDebugJuliaAmbientSyncHelixSpin: true,
  wormholeDebugJuliaAmbientSyncStars: true,
  wormholeDebugJuliaHelixSpinRate: 0.25,
  wormholeDebugJuliaHelixSpinAudioSync: true,
};

/** Original — MP3 drives shader uTime; helix mesh + stars use wall clock. */
export const WORMHOLE_JULIA_AMBIENT_SYNC_PRESET_SHADERS_ONLY: WormholeJuliaAmbientSyncTargetState = {
  wormholeDebugJuliaAmbientSync: true,
  wormholeDebugJuliaAmbientSyncRate: 3,
  wormholeDebugJuliaAmbientSyncShaders: true,
  wormholeDebugJuliaAmbientSyncHelixSpin: false,
  wormholeDebugJuliaAmbientSyncStars: false,
  wormholeDebugJuliaHelixSpinRate: 1,
  wormholeDebugJuliaHelixSpinAudioSync: false,
};

/** Full — MP3 drives shaders, helix spin, and stars (post–sync-fix behaviour). */
export const WORMHOLE_JULIA_AMBIENT_SYNC_PRESET_FULL: WormholeJuliaAmbientSyncTargetState = {
  wormholeDebugJuliaAmbientSync: true,
  wormholeDebugJuliaAmbientSyncRate: 3,
  wormholeDebugJuliaAmbientSyncShaders: true,
  wormholeDebugJuliaAmbientSyncHelixSpin: true,
  wormholeDebugJuliaAmbientSyncStars: true,
  wormholeDebugJuliaHelixSpinRate: 1,
  wormholeDebugJuliaHelixSpinAudioSync: true,
};

export type WormholeJuliaAmbientSyncTimes = {
  /** Rings / helix tube / sky shader `uTime` (before equalizer nudges). */
  patternTime: number;
  /** Helix mesh `rotation.z` clock (× {@link WORMHOLE_JULIA_HELIX_SPIN_T}). */
  helixSpinTime: number;
  /** Star field `rotation.z` clock (× 0.005). */
  starTime: number;
  clockElapsed: number;
  audioSec: number | null;
  patternFromAudio: boolean;
  helixSpinFromAudio: boolean;
  starsFromAudio: boolean;
};

function scaledRate(rate: number): number {
  return Math.max(0.05, rate);
}

/**
 * Resolves independent animation clocks for Julia ambient sync targets.
 * Used by {@link JuliaWormholeBackdrop} and tunnel debug monitor.
 */
export function resolveWormholeJuliaAmbientSyncTimes(opts: {
  syncEnabled: boolean;
  patternSyncRate: number;
  helixSpinRate: number;
  helixSpinAudioSync: boolean;
  syncShaders: boolean;
  syncHelixSpin: boolean;
  syncStars: boolean;
  clockElapsed: number;
  warmAudio?: boolean;
}): WormholeJuliaAmbientSyncTimes {
  const {
    syncEnabled,
    patternSyncRate,
    helixSpinRate,
    helixSpinAudioSync,
    syncShaders,
    syncHelixSpin,
    syncStars,
    clockElapsed,
    warmAudio,
  } = opts;

  if (warmAudio && syncEnabled) warmWormhole5AmbientAudio();
  const audioSec = getWormhole5AmbientPlaybackTime();

  let patternTime = clockElapsed;
  let patternFromAudio = false;
  if (syncEnabled && syncShaders && audioSec != null) {
    patternTime = audioSec * scaledRate(patternSyncRate);
    patternFromAudio = true;
  }

  let helixSpinTime = clockElapsed * helixSpinRate;
  let helixSpinFromAudio = false;
  if (syncEnabled && syncHelixSpin && helixSpinAudioSync && audioSec != null) {
    helixSpinTime = audioSec * scaledRate(patternSyncRate) * helixSpinRate;
    helixSpinFromAudio = true;
  }

  let starTime = clockElapsed;
  let starsFromAudio = false;
  if (syncEnabled && syncStars && audioSec != null) {
    starTime = audioSec * scaledRate(patternSyncRate);
    starsFromAudio = true;
  }

  return {
    patternTime,
    helixSpinTime,
    starTime,
    clockElapsed,
    audioSec,
    patternFromAudio,
    helixSpinFromAudio,
    starsFromAudio,
  };
}

/** Instantaneous helix spin (rad/s) — for debug monitor. */
export function wormholeJuliaHelixRadPerSec(opts: {
  helixSpinFromAudio: boolean;
  helixSpinRate: number;
  patternSyncRate: number;
  helixSpinT?: number;
}): { wallClock: number; audio: number | null } {
  const helixSpinT = opts.helixSpinT ?? WORMHOLE_JULIA_HELIX_SPIN_T;
  const wallClock = helixSpinT * opts.helixSpinRate;
  const audio = opts.helixSpinFromAudio
    ? helixSpinT * scaledRate(opts.patternSyncRate) * opts.helixSpinRate
    : null;
  return { wallClock, audio };
}
