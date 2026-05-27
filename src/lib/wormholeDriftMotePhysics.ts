/**
 * Tunnel drift-mote motion — shared by {@link JuliaWormholeBackdrop} particles and hero-coin face glints.
 */

/** Wave + swirl constants (must stay in sync with tunnel particle tick). */
export const DRIFT_MOTE_PHYSICS = {
  zVelMul: 12,
  angSpeedBase: 0.04,
  angSpeedPhaseMul: 0.002,
  waveAmpRingMul: 0.042,
  slowHz: 1.75,
  slowPhaseMul: 2.35,
  slowZMul: 0.041,
  slowXYMul: 0.88,
  fastHz: 2.62,
  fastPhaseMul: 1.82,
  fastZMul: 0.033,
  shimHz: 4.15,
  shimPhaseMul: 5.9,
  pulseBase: 0.62,
  pulseRange: 0.38,
} as const;

export type VirtualDriftMote = {
  x: number;
  y: number;
  z: number;
  phase: number;
};

export type CoinDriftMoteArcMeta = {
  /** Face-disc radians where the glint enters (approaching). */
  entryAngle: number;
  /** Sweep span across the face while passing the coin plane. */
  arcSpan: number;
  /** Extra vertical travel on the disc (some flanks read flat without this). */
  yBoost: number;
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function driftMoteWaveAmp(ringRadius: number): number {
  return Math.max(0.5, ringRadius) * DRIFT_MOTE_PHYSICS.waveAmpRingMul;
}

export function driftMoteWaveSample(
  time: number,
  phase: number,
  z: number,
): { slow: number; fast: number; pulse: number } {
  const p = DRIFT_MOTE_PHYSICS;
  const slow = Math.sin(time * p.slowHz + phase * p.slowPhaseMul + z * p.slowZMul);
  const fast = Math.cos(time * p.fastHz + phase * p.fastPhaseMul + z * p.fastZMul);
  const shim = Math.sin(time * p.shimHz + phase * p.shimPhaseMul);
  const pulse = p.pulseBase + p.pulseRange * (shim * 0.5 + 0.5);
  return { slow, fast, pulse };
}

/** Same gate as tunnel {@link JuliaWormholeBackdrop} `driftMoteWaveActive`. */
export function isDriftMoteWaveActive(
  scrollInputIdle: number,
  velocity: number,
  debugIdleBuzz: boolean,
): boolean {
  const scrollCoasting = Math.abs(velocity) >= 0.08;
  const handsOff = scrollInputIdle > 0.98 && !scrollCoasting;
  return !handsOff || debugIdleBuzz;
}

/**
 * One integration step — matches tunnel particle body in `JuliaWormholeBackdrop`.
 */
export function tickVirtualDriftMote(
  mote: VirtualDriftMote,
  dt: number,
  time: number,
  velocity: number,
  ringRadius: number,
  waveActive: boolean,
  tunnelLength: number,
): void {
  const p = DRIFT_MOTE_PHYSICS;
  mote.z += velocity * dt * p.zVelMul;
  if (mote.z > 5) mote.z -= tunnelLength;
  else if (mote.z < -tunnelLength + 5) mote.z += tunnelLength;

  const angSpeed = p.angSpeedBase + mote.phase * p.angSpeedPhaseMul;
  const cs = Math.cos(angSpeed * dt);
  const sn = Math.sin(angSpeed * dt);
  const x = mote.x;
  const y = mote.y;
  mote.x = x * cs - y * sn;
  mote.y = x * sn + y * cs;

  if (waveActive) {
    const waveAmp = driftMoteWaveAmp(ringRadius);
    const w = driftMoteWaveSample(time, mote.phase, mote.z);
    mote.x += w.slow * waveAmp * p.slowXYMul * w.pulse;
    mote.y += w.fast * waveAmp * w.pulse;
  }
}

const COIN_FACE_DISC_R = 0.72;
/** Face travel is subtler than raw tunnel XY — glints slide, not jitter. */
const COIN_FACE_PROJ_SCALE = 0.58;
/** Z window (tunnel space) where a mote reads as flying by the coin mouth. */
const COIN_FLY_BY_Z_LO = -7.5;
const COIN_FLY_BY_Z_HI = 7.5;

/**
 * 0 = far behind coin, 0.5 = at coin plane, 1 = far ahead — one approach → curve → depart cycle.
 */
export function coinFlyByPhase(z: number): number {
  const clamped = Math.min(COIN_FLY_BY_Z_HI, Math.max(COIN_FLY_BY_Z_LO, z));
  return (clamped - COIN_FLY_BY_Z_LO) / (COIN_FLY_BY_Z_HI - COIN_FLY_BY_Z_LO);
}

/** Brightness + radial placement peak as the mote passes the coin plane, fade at entry/exit. */
export function coinFlyByProximity(z: number): number {
  const u = coinFlyByPhase(z);
  let prox = Math.sin(Math.PI * u) ** 0.82;
  if (z < COIN_FLY_BY_Z_LO) prox *= smoothstep(-12, COIN_FLY_BY_Z_LO, z);
  if (z > COIN_FLY_BY_Z_HI) prox *= 1 - smoothstep(COIN_FLY_BY_Z_HI, 11.5, z);
  return prox;
}

/** Map tunnel-space mote → coin disc with fly-by arc + buzz (front or mirrored back). */
export function projectDriftMoteToCoinFace(
  mote: VirtualDriftMote,
  ringRadius: number,
  time: number,
  face: 'front' | 'back',
  arcMeta: CoinDriftMoteArcMeta,
  waveActive: boolean,
): { x: number; y: number; pulse: number; depthFade: number; flyBy: number } {
  const u = coinFlyByPhase(mote.z);
  const flyBy = coinFlyByProximity(mote.z);
  const liveSpin = Math.atan2(mote.y, mote.x) * 0.2;
  const sweepAngle = arcMeta.entryAngle + u * arcMeta.arcSpan + liveSpin;
  const rArc = COIN_FACE_DISC_R * (0.93 - 0.5 * Math.sin(Math.PI * u));

  let fx = Math.cos(sweepAngle) * rArc;
  let fy = Math.sin(sweepAngle) * rArc * arcMeta.yBoost;

  const scale = (COIN_FACE_DISC_R / Math.max(2.5, ringRadius * 0.92)) * COIN_FACE_PROJ_SCALE;
  fx += mote.x * scale * 0.24 * flyBy;
  fy += mote.y * scale * 0.42 * flyBy * arcMeta.yBoost;

  const sample = driftMoteWaveSample(time, mote.phase, mote.z);
  if (waveActive) {
    const waveAmp = driftMoteWaveAmp(ringRadius) * COIN_FACE_PROJ_SCALE * 0.64;
    fx += sample.slow * waveAmp * DRIFT_MOTE_PHYSICS.slowXYMul * sample.pulse;
    fy += sample.fast * waveAmp * sample.pulse * arcMeta.yBoost;
    const diag = Math.sin(time * 1.38 + mote.phase * 3.1 + mote.z * 0.028);
    fx += diag * waveAmp * 0.38 * sample.pulse;
    fy += Math.cos(time * 1.52 + mote.phase * 2.65 + mote.z * 0.031) * waveAmp * 0.38 * sample.pulse;
  }

  if (face === 'back') {
    fx *= -0.86;
    fy *= 0.9;
  }

  const r = Math.hypot(fx, fy);
  if (r > COIN_FACE_DISC_R) {
    const k = COIN_FACE_DISC_R / r;
    fx *= k;
    fy *= k;
  }

  return { x: fx, y: fy, pulse: sample.pulse, depthFade: flyBy, flyBy };
}

/** Direct tunnel XY → coin disc for live particle debug reflections. */
export function projectLiveParticleToCoinFace(
  x: number,
  y: number,
  z: number,
  ringRadius: number,
  face: 'front' | 'back',
): { x: number; y: number; fade: number } {
  const scale = (COIN_FACE_DISC_R / Math.max(2.5, ringRadius * 0.92)) * COIN_FACE_PROJ_SCALE;
  const fade = coinFlyByProximity(z);
  let fx = x * scale;
  let fy = y * scale * 1.42;
  if (face === 'back') {
    fx *= -0.88;
    fy *= 0.92;
  }
  const r = Math.hypot(fx, fy);
  if (r > COIN_FACE_DISC_R) {
    const k = COIN_FACE_DISC_R / r;
    fx *= k;
    fy *= k;
  }
  return { x: fx, y: fy, fade };
}

export const COIN_DRIFT_MOTE_FACE_Z_EPS = 0.007;

/** Seed positions — left / right flanks + ahead of the coin (tunnel +Z toward mouth). */
export const COIN_DRIFT_MOTE_VIRTUAL_SEEDS: readonly VirtualDriftMote[] = [
  { x: -5.2, y: 1.15, z: -6.2, phase: 0.85 },
  { x: 5.4, y: -1.05, z: -5.4, phase: 2.35 },
  { x: 0.22, y: 0.95, z: -5.8, phase: 4.1 },
] as const;

/** Per-mote face arc: enter from flank, sweep across disc, exit as Z carries mote away. */
export const COIN_DRIFT_MOTE_ARC_META: readonly CoinDriftMoteArcMeta[] = [
  { entryAngle: 2.72, arcSpan: 2.35, yBoost: 1.48 },
  { entryAngle: -0.42, arcSpan: 2.45, yBoost: 1.52 },
  { entryAngle: 1.58, arcSpan: 2.15, yBoost: 1.55 },
] as const;

export const COIN_DRIFT_MOTE_FACE_HUES = [0xff4da8, 0x8e3bff, 0x4dffb0] as const;

export type CoinDriftMoteGlintRole = {
  moteIndex: number;
  face: 'front' | 'back';
  intensityMul: number;
};

/** Four face glints: flank sweeps on front, ahead-mote on both faces as it curves past. */
export const COIN_DRIFT_MOTE_GLINT_ROLES: readonly CoinDriftMoteGlintRole[] = [
  { moteIndex: 0, face: 'front', intensityMul: 0.9 },
  { moteIndex: 1, face: 'front', intensityMul: 0.86 },
  { moteIndex: 2, face: 'front', intensityMul: 0.52 },
  { moteIndex: 2, face: 'back', intensityMul: 0.58 },
] as const;

/** Typical wormhole ring-stack length for virtual mote Z wrap (coin GL approximation). */
export const COIN_DRIFT_MOTE_TUNNEL_LENGTH = 420;
