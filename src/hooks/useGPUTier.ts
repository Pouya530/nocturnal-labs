'use client';

import { useEffect, useState } from 'react';
import { getGPUTier, type TierResult } from 'detect-gpu';

export function useGPUTier(): TierResult | null {
  const [tier, setTier] = useState<TierResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getGPUTier().then((r) => {
      if (!cancelled) setTier(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return tier;
}
