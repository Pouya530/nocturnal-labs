'use client';

import type { ReactElement } from 'react';

import { Wormhole3ClientShell } from '@/components/wormhole/Wormhole3ClientShell';
import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { WORMHOLE3_TUNNEL } from '@/lib/wormholePageConfig';

/** `/wormhole3` — throat wormhole + same hero coin stack as `/wormhole`. */
export function Wormhole3Route(): ReactElement {
  return (
    <Wormhole3ClientShell>
      <WormholePlanContent scrollImpulseSign={WORMHOLE3_TUNNEL.scrollImpulseSign} />
    </Wormhole3ClientShell>
  );
}
