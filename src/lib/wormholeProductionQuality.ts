/**
 * Desktop “max quality” tier (DPR floor, dense geometry, tight bloom).
 * Disabled so production matches `npm run dev` / localhost:3001; re-enable when tuning mobile + prod together.
 */
export function wormholeDesktopProductionHighQuality(): boolean {
  return false;
}
