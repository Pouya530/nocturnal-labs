'use client';

import type { ReactElement } from 'react';

import { Wormhole3ClientShell } from '@/components/wormhole/Wormhole3ClientShell';
import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';

/** `/wormhole3` — throat wormhole + same hero coin stack as `/wormhole`. */
export function Wormhole3Route(): ReactElement {
  return (
    <Wormhole3ClientShell>
      <WormholePlanContent />
    </Wormhole3ClientShell>
  );
}
