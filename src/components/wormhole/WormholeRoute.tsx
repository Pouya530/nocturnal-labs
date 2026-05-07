'use client';

import type { ReactElement } from 'react';

import { WormholeClientShell } from '@/components/wormhole/WormholeClientShell';
import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';

/** `/wormhole` page content — `WormholeClientShell` lazy-loads the Three.js backdrop. */
export function WormholeRoute(): ReactElement {
  return (
    <WormholeClientShell>
      <WormholePlanContent />
    </WormholeClientShell>
  );
}
