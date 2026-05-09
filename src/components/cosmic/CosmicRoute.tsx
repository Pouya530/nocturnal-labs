'use client';

import type { ReactElement } from 'react';

import { CosmicClientShell } from '@/components/cosmic/CosmicClientShell';
import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';

/** `/cosmic` — standalone volumetric backdrop; same hero / coin stack as wormhole lab previews. */
export function CosmicRoute(): ReactElement {
  return (
    <CosmicClientShell>
      <WormholePlanContent />
    </CosmicClientShell>
  );
}
