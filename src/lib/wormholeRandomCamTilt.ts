import type * as THREE from 'three';

import {
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_TX,
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_TY,
} from '@/lib/wormholePageConfig';

/** Per-backdrop runtime for tunnel debug random camera tilt. */
export type RandomCamTiltRuntime = {
  pulse: number;
  lastDepth: number;
  /** Last scroll-tilt direction in [-1, 1] (amount applied separately each frame). */
  dirX: number;
  dirY: number;
  rx: number;
  ry: number;
  lastAmount: number;
};

export function createRandomCamTiltRuntime(): RandomCamTiltRuntime {
  return {
    pulse: 0,
    lastDepth: 0,
    dirX: 0,
    dirY: 0,
    rx: 0,
    ry: 0,
    lastAmount: -1,
  };
}

/**
 * After `camera.lookAt`, applies smoothed random pitch/yaw. {@link amount} scales targets every
 * frame so the debug slider responds immediately, not only on the next scroll pulse.
 */
export function applyRandomCamTiltAfterLookAt(
  camera: THREE.PerspectiveCamera,
  enabled: boolean,
  amount: number,
  velocity: number,
  depth: number,
  rt: RandomCamTiltRuntime,
  dt: number,
): void {
  const tiltMul = Math.max(0, amount);
  const decay = 1 - Math.exp(-dt * 6);

  if (!enabled || tiltMul < 1e-5) {
    rt.dirX = 0;
    rt.dirY = 0;
    rt.rx += (0 - rt.rx) * decay;
    rt.ry += (0 - rt.ry) * decay;
    rt.pulse = 0;
    rt.lastAmount = amount;
    if (rt.rx !== 0 || rt.ry !== 0) {
      camera.rotateX(rt.rx);
      camera.rotateY(rt.ry);
    }
    return;
  }

  rt.pulse += dt;
  const scrolling =
    Math.abs(velocity) > 0.012 || Math.abs(depth - rt.lastDepth) > 1.25;
  rt.lastDepth = depth;

  if (scrolling && rt.pulse > 0.28) {
    rt.pulse = 0;
    rt.dirX = Math.random() * 2 - 1;
    rt.dirY = Math.random() * 2 - 1;
  }

  /** Slider / first enable: keep a direction so amount scales visible tilt without waiting for scroll. */
  if (rt.dirX === 0 && rt.dirY === 0) {
    rt.dirX = Math.random() * 2 - 1;
    rt.dirY = Math.random() * 2 - 1;
  }

  const targetX = rt.dirX * WORMHOLE_DEBUG_RANDOM_CAM_TILT_TX * tiltMul;
  const targetY = rt.dirY * WORMHOLE_DEBUG_RANDOM_CAM_TILT_TY * tiltMul;

  if (rt.lastAmount > 1e-5 && Math.abs(tiltMul - rt.lastAmount) > 1e-4) {
    const ratio = tiltMul / rt.lastAmount;
    rt.rx *= ratio;
    rt.ry *= ratio;
  }
  rt.lastAmount = tiltMul;

  const ease = 1 - Math.exp(-dt * 5.5);
  rt.rx += (targetX - rt.rx) * ease;
  rt.ry += (targetY - rt.ry) * ease;

  camera.rotateX(rt.rx);
  camera.rotateY(rt.ry);
}
