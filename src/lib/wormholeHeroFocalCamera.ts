/**
 * Maps {@link HERO_FOCAL_POINT} screen fractions to Three.js `lookAt` offsets so the tube mouth
 * aligns with the hero coin anchor. See `NOCTURNAL_LABS_COIN_CENTRING_UX_UI.md` §6.
 */

export type HeroFocalPoint = { x: number; y: number };

/** Tunable — scales screen-fraction delta into world-space lookAt XY at z = -10. */
export const HERO_FOCAL_CAM_LOOK_MUL_X = 2.8;
export const HERO_FOCAL_CAM_LOOK_MUL_Y = 3.4;

export function computeHeroFocalLookAtOffset(focal: HeroFocalPoint): { x: number; y: number } {
  return {
    x: (focal.x - 0.5) * HERO_FOCAL_CAM_LOOK_MUL_X,
    y: (focal.y - 0.5) * HERO_FOCAL_CAM_LOOK_MUL_Y,
  };
}
