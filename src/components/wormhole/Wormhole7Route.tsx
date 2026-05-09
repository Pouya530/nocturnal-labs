'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole7ClientShell } from '@/components/wormhole/Wormhole7ClientShell';

/** `/wormhole7` — isolated preview route; does not alter `/`, `/wormhole5`, or `/wormhole6`. */
export function Wormhole7Route(): ReactElement {
  return (
    <Wormhole7ClientShell>
      <WormholePlanContent />
    </Wormhole7ClientShell>
  );
}
