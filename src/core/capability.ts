let tier = 2;

export async function initCapability(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { getGPUTier } = await import('detect-gpu');
    const gpu = await getGPUTier();
    const t = typeof gpu.tier === 'number' ? gpu.tier : 2;
    if (t <= 0) tier = 2;
    else tier = Math.min(3, Math.max(1, t));
  } catch {
    tier = 2;
  }
}

export const Capability = {
  tier(): number {
    return tier;
  },
};
