'use client';

import type { ReactElement } from 'react';

import { Wormhole4ClientShell } from '@/components/wormhole/Wormhole4ClientShell';
import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';

/** `/wormhole4` — classic tunnel shell with inverted ring growth (growth-inversion doc). */
export function Wormhole4Route(): ReactElement {
  return (
    <Wormhole4ClientShell>
      <WormholePlanContent />
    </Wormhole4ClientShell>
  );
}
