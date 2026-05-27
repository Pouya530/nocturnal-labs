/**
 * Galaxy Z Fold inner display in portrait (~840–980 CSS px, coarse pointer).
 * Keep in sync with the portrait fold block in `globals.css`.
 */
export const GALAXY_FOLD_INNER_PORTRAIT_MQ =
  '(orientation: portrait) and (pointer: coarse) and (min-width: 840px) and (max-width: 980px)';

export function isGalaxyFoldInnerPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(GALAXY_FOLD_INNER_PORTRAIT_MQ).matches;
}
