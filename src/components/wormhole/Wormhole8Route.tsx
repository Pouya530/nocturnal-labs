'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole8ClientShell } from '@/components/wormhole/Wormhole8ClientShell';

/** `/wormhole8` — wormhole5-scale GL + home journey-from-start / intro cam; isolated preview route. */
export function Wormhole8Route(): ReactElement {
  return (
    <Wormhole8ClientShell>
      <WormholePlanContent />
    </Wormhole8ClientShell>
  );
}
