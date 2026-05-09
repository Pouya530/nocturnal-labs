/**
 * High-frequency fall tilt from {@link WormholeFallingCoin} → {@link LogoCoin} without tunnelStore
 * subscription churn (same RAF as the CSS drift tick).
 */
export type WormholeFallMotionSnapshot = {
  /** Same blend weight `w` as fall drift (0–1). */
  w: number;
  rotateXDeg: number;
  rotateZDeg: number;
};

let snapshot: WormholeFallMotionSnapshot = { w: 0, rotateXDeg: 0, rotateZDeg: 0 };

export function setWormholeFallMotionSnapshot(next: WormholeFallMotionSnapshot): void {
  snapshot = next;
}

export function getWormholeFallMotionSnapshot(): WormholeFallMotionSnapshot {
  return snapshot;
}

export function resetWormholeFallMotionSnapshot(): void {
  snapshot = { w: 0, rotateXDeg: 0, rotateZDeg: 0 };
}
