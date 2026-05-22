/** Gradient atmosphere presets for {@link Wormhole4AtmosphereOverlay} (tunnel debug + lab routes). */
export const WORMHOLE_ATMOSPHERE_PRESET_IDS = [
  'off',
  'nebula',
  'ember',
  'glacier',
  'corona',
] as const;

export type WormholeAtmospherePreset = (typeof WORMHOLE_ATMOSPHERE_PRESET_IDS)[number];

export const WORMHOLE_ATMOSPHERE_PRESET_LABELS: Record<Exclude<WormholeAtmospherePreset, 'off'>, string> =
  {
    nebula: 'Nebula (classic)',
    ember: 'Ember (warm rim)',
    glacier: 'Glacier (cool cyan)',
    corona: 'Corona (gold halo)',
  };
