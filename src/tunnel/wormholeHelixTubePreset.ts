/** Lab helix {@link wormholeJuliaFragment} tube look when Julia ribbon shader is on (`uMode == 2`). */
export const WORMHOLE_HELIX_TUBE_VARIANTS = [0, 1, 2, 3, 4, 5, 6] as const;

export type WormholeHelixTubeVariant = (typeof WORMHOLE_HELIX_TUBE_VARIANTS)[number];

export const WORMHOLE_HELIX_TUBE_LABELS: Record<WormholeHelixTubeVariant, string> = {
  0: 'Classic Julia ribbon',
  1: 'Plasma filaments',
  2: 'Ion lattice',
  3: 'Phase weave',
  4: 'Aurora ribbons',
  5: 'Molten vein',
  6: 'Crystal facets',
};

export function clampHelixTubeVariant(n: number): WormholeHelixTubeVariant {
  const x = Math.round(n);
  if (x <= 0) return 0;
  if (x >= 6) return 6;
  return x as WormholeHelixTubeVariant;
}
