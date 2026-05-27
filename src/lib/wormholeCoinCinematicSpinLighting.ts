/** Polished-metal PBR when {@link wormhole5CoinCinematicSpinLightingEnabled} is on. */
export const COIN_CINEMATIC_FACE_METALNESS = 0.9;
export const COIN_CINEMATIC_FACE_ROUGHNESS = 0.18;
export const COIN_CINEMATIC_RIM_METALNESS = 0.94;
export const COIN_CINEMATIC_RIM_ROUGHNESS = 0.16;
export const COIN_CINEMATIC_ENV_INTENSITY = 0.42;

/** Fixed world-space key lights — coin Y-spin sweeps specular across faces. */
export const COIN_CINEMATIC_LEFT_LIGHT: readonly [number, number, number] = [-5.4, 1.55, 2.35];
export const COIN_CINEMATIC_RIGHT_LIGHT: readonly [number, number, number] = [5.4, 1.55, 2.35];
export const COIN_CINEMATIC_KEY_INTENSITY = 3.85;
export const COIN_CINEMATIC_KEY_DISTANCE = 18;
export const COIN_CINEMATIC_LEFT_COLOR = '#fff4e6';
export const COIN_CINEMATIC_RIGHT_COLOR = '#e6eeff';

/** Rim “edge blink” — peaks when the coin is edge-on to the camera. */
export const COIN_CINEMATIC_EDGE_INTENSITY = 2.35;
export const COIN_CINEMATIC_EDGE_COLOR = '#f8fbff';

/** Base scene fill when cinematic keys take over. */
export const COIN_CINEMATIC_AMBIENT = 0.14;
export const COIN_CINEMATIC_DIR_INTENSITY = 0.08;

/** Bloom on face-on glints (UnrealBloomPass). */
export const COIN_CINEMATIC_BLOOM_BASE = 0.06;
export const COIN_CINEMATIC_BLOOM_PEAK = 0.38;
export const COIN_CINEMATIC_BLOOM_RADIUS = 0.52;
export const COIN_CINEMATIC_BLOOM_THRESHOLD = 0.72;

/**
 * Two broad face highlights + sharp edge blink per Y rotation.
 * `spinY` = coin {@link THREE.Group} `.rotation.y`.
 */
export function coinCinematicHighlightWeights(spinY: number): {
  leftFace: number;
  rightFace: number;
  edgeBlink: number;
  bloom: number;
} {
  const c = Math.cos(spinY);
  const s = Math.sin(spinY);
  const leftFace = Math.pow(Math.max(0, -c * 0.92 + 0.08), 1.35);
  const rightFace = Math.pow(Math.max(0, c * 0.92 + 0.08), 1.35);
  const edgeBlink = Math.pow(Math.abs(s), 0.48);
  const bloom = Math.max(leftFace, rightFace, edgeBlink * 0.72);
  return { leftFace, rightFace, edgeBlink, bloom };
}
