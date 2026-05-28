/**
 * Maps {@link HERO_FOCAL_POINT} screen fractions to Three.js `lookAt` offsets so the tube mouth
 * aligns with the hero coin anchor. See `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md` §6.
 */

export type HeroFocalPoint = { x: number; y: number };

export type HeroFocalProfile = 'home' | 'wormhole5Lab';

/** Tunable — scales screen-fraction delta into world-space lookAt XY at z = -10. */
export const HERO_FOCAL_CAM_LOOK_MUL_X = 2.8;
export const HERO_FOCAL_CAM_LOOK_MUL_Y = 3.4;

/** `/wormhole5` lab — wider void ({@link WORMHOLE_HOME_TUNNEL_VISUAL.holeRadius}) needs stronger Y coupling. */
export const HERO_FOCAL_CAM_LOOK_MUL_WORMHOLE5_LAB = {
  x: 2.8,
  y: 5.1,
} as const;

export function computeHeroFocalLookAtOffset(
  focal: HeroFocalPoint,
  profile: HeroFocalProfile = 'home',
): { x: number; y: number } {
  const mul =
    profile === 'wormhole5Lab' ? HERO_FOCAL_CAM_LOOK_MUL_WORMHOLE5_LAB : { x: HERO_FOCAL_CAM_LOOK_MUL_X, y: HERO_FOCAL_CAM_LOOK_MUL_Y };
  return {
    x: (focal.x - 0.5) * mul.x,
    y: (focal.y - 0.5) * mul.y,
  };
}
