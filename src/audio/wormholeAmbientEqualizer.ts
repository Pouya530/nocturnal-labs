/**
 * Web Audio analyser for ambient MP3 — drives Julia “equalizer” uniforms on `/wormhole20`.
 * Separate from timeline sync ({@link getWormhole5AmbientPlaybackTime}).
 */

import { getWormhole5AmbientAudioElement } from '@/audio/wormhole5AmbientAudio';

export type WormholeAmbientEqualizerBands = {
  /** Normalized 0–1 (smoothed). */
  bass: number;
  mid: number;
  treble: number;
  rms: number;
};

const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let freqBuf: Uint8Array | null = null;
let attachedElement: HTMLAudioElement | null = null;
let enabled = false;

const smoothed: WormholeAmbientEqualizerBands = {
  bass: 0,
  mid: 0,
  treble: 0,
  rms: 0,
};

function emit(): void {
  for (const l of listeners) l();
}

function lerpToward(current: number, target: number, dt: number, attack: number, release: number): number {
  const rate = target > current ? attack : release;
  return current + (target - current) * (1 - Math.exp(-dt * rate));
}

function binAvg(data: Uint8Array, from: number, to: number): number {
  let sum = 0;
  let n = 0;
  const hi = Math.min(to, data.length - 1);
  for (let i = from; i <= hi; i++) {
    sum += data[i]!;
    n++;
  }
  return n > 0 ? sum / n / 255 : 0;
}

export function subscribeWormholeAmbientEqualizer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isWormholeAmbientEqualizerAttached(): boolean {
  return enabled && !!analyser;
}

export function getWormholeAmbientEqualizerBands(): WormholeAmbientEqualizerBands {
  return { ...smoothed };
}

export async function resumeWormholeAmbientAudioContext(): Promise<void> {
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
}

function attachToElement(audio: HTMLAudioElement): void {
  if (attachedElement === audio && source) return;
  detachAnalyserGraph();

  ctx = new AudioContext();
  source = ctx.createMediaElementSource(audio);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  freqBuf = new Uint8Array(analyser.frequencyBinCount);
  attachedElement = audio;
}

export function enableWormholeAmbientEqualizer(): void {
  enabled = true;
  const audio = getWormhole5AmbientAudioElement();
  if (audio) attachToElement(audio);
  emit();
}

export function disableWormholeAmbientEqualizer(): void {
  enabled = false;
  detachAnalyserGraph();
  smoothed.bass = 0;
  smoothed.mid = 0;
  smoothed.treble = 0;
  smoothed.rms = 0;
  emit();
}

function detachAnalyserGraph(): void {
  try {
    source?.disconnect();
    analyser?.disconnect();
  } catch {
    /* already disconnected */
  }
  source = null;
  analyser = null;
  freqBuf = null;
  attachedElement = null;
  if (ctx) {
    void ctx.close().catch(() => {});
    ctx = null;
  }
}

/** Call when the shared ambient element is first created (wormhole20 route). */
export function wormholeAmbientEqualizerOnAudioElementReady(audio: HTMLAudioElement): void {
  if (!enabled) return;
  if (attachedElement !== audio) attachToElement(audio);
}

/**
 * Sample FFT each frame when equalizer mode is on. Returns smoothed bands (0–1).
 */
export function tickWormholeAmbientEqualizer(dt: number): WormholeAmbientEqualizerBands {
  if (!enabled) {
    smoothed.bass = 0;
    smoothed.mid = 0;
    smoothed.treble = 0;
    smoothed.rms = 0;
    return { ...smoothed };
  }

  const media = getWormhole5AmbientAudioElement();
  if (!media) {
    return { ...smoothed };
  }
  if (!source || attachedElement !== media) {
    attachToElement(media);
  }

  if (!analyser || !freqBuf || !ctx) {
    return { ...smoothed };
  }

  if (ctx.state === 'suspended' && !media.paused) {
    void ctx.resume().catch(() => {});
  }

  analyser.getByteFrequencyData(freqBuf as Uint8Array<ArrayBuffer>);
  const bassT = binAvg(freqBuf, 0, 3);
  const midT = binAvg(freqBuf, 4, 18);
  const trebleT = binAvg(freqBuf, 19, 40);
  const rmsT = (bassT + midT + trebleT) / 3;

  const attack = 14;
  const release = 9;
  smoothed.bass = lerpToward(smoothed.bass, bassT, dt, attack, release);
  smoothed.mid = lerpToward(smoothed.mid, midT, dt, attack, release);
  smoothed.treble = lerpToward(smoothed.treble, trebleT, dt, attack, release);
  smoothed.rms = lerpToward(smoothed.rms, rmsT, dt, attack, release);
  emit();
  return { ...smoothed };
}
