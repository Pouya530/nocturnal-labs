/**
 * Galaxy Z Fold viewport classes — keep in sync with fold blocks in `globals.css`.
 */

/** Inner display portrait (~840–980 CSS px, coarse pointer). */
export const GALAXY_FOLD_INNER_PORTRAIT_MQ =
  '(orientation: portrait) and (pointer: coarse) and (min-width: 840px) and (max-width: 980px)';

/** Cover / narrow outer portrait (~≤320px wide). */
export const GALAXY_FOLD_FOLDED_MQ = '(max-width: 320px)';

/** Unfolded near-square handset canvas. */
export const GALAXY_FOLD_UNFOLDED_MQ =
  '(min-aspect-ratio: 9/10) and (max-aspect-ratio: 11/10) and (max-width: 900px)';

export type GalaxyFoldViewportClass = 'standard' | 'folded' | 'unfolded';

export function isGalaxyFoldInnerPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(GALAXY_FOLD_INNER_PORTRAIT_MQ).matches;
}

export function getGalaxyFoldViewportClass(): GalaxyFoldViewportClass {
  if (typeof window === 'undefined') return 'standard';
  if (window.matchMedia(GALAXY_FOLD_FOLDED_MQ).matches) return 'folded';
  if (window.matchMedia(GALAXY_FOLD_UNFOLDED_MQ).matches) return 'unfolded';
  return 'standard';
}

export function subscribeGalaxyFoldViewportClass(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const foldedMq = window.matchMedia(GALAXY_FOLD_FOLDED_MQ);
  const unfoldedMq = window.matchMedia(GALAXY_FOLD_UNFOLDED_MQ);
  const innerMq = window.matchMedia(GALAXY_FOLD_INNER_PORTRAIT_MQ);

  const onChange = () => listener();
  foldedMq.addEventListener('change', onChange);
  unfoldedMq.addEventListener('change', onChange);
  innerMq.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);

  return () => {
    foldedMq.removeEventListener('change', onChange);
    unfoldedMq.removeEventListener('change', onChange);
    innerMq.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}
