/**
 * Live tunnel drift-mote positions from {@link JuliaWormholeBackdrop} → hero coin face glints.
 * Separate WebGL contexts; updated once per backdrop frame when the debug flag is on.
 */
import { coinFlyByProximity } from '@/lib/wormholeDriftMotePhysics';

export type LiveDriftMoteParticleSample = {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
};

export const COIN_LIVE_PARTICLE_GLINT_MAX = 12;

const Z_WINDOW_LO = -10;
const Z_WINDOW_HI = 10;

type Candidate = { score: number; i: number };

const scratch: Candidate[] = [];
let samples: LiveDriftMoteParticleSample[] = [];

export function publishLiveDriftMoteParticleSamples(
  positions: Float32Array,
  colors: Float32Array,
  count: number,
  ringRadius: number,
): void {
  scratch.length = 0;
  const ring = Math.max(0.5, ringRadius);
  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2]!;
    if (z < Z_WINDOW_LO || z > Z_WINDOW_HI) continue;
    const prox = coinFlyByProximity(z);
    if (prox < 0.07) continue;
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const radial = Math.hypot(x, y);
    const radialWeight = 1 / (1 + (radial / (ring * 1.05)) ** 1.55);
    scratch.push({ score: prox * radialWeight, i });
  }
  scratch.sort((a, b) => b.score - a.score);
  const take = Math.min(COIN_LIVE_PARTICLE_GLINT_MAX, scratch.length);
  const next: LiveDriftMoteParticleSample[] = [];
  for (let k = 0; k < take; k++) {
    const idx = scratch[k]!.i;
    next.push({
      x: positions[idx * 3]!,
      y: positions[idx * 3 + 1]!,
      z: positions[idx * 3 + 2]!,
      r: colors[idx * 3]!,
      g: colors[idx * 3 + 1]!,
      b: colors[idx * 3 + 2]!,
    });
  }
  samples = next;
}

export function getLiveDriftMoteParticleSamples(): readonly LiveDriftMoteParticleSample[] {
  return samples;
}

export function clearLiveDriftMoteParticleSamples(): void {
  samples = [];
}
