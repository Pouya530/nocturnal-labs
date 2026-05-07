'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/** `/wormhole5` — wormhole4-class tunnel + journey camera; mouth rings overlay; locked start at 0 / 0. */
export function Wormhole5Route(): ReactElement {
  return (
    <Wormhole5ClientShell>
      <WormholePlanContent />
    </Wormhole5ClientShell>
  );
}
