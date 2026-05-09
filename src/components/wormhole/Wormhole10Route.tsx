'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole10ClientShell } from '@/components/wormhole/Wormhole10ClientShell';

/** `/wormhole10` — wormhole5 Julia tunnel + volumetric cosmic backdrop layered underneath. */
export function Wormhole10Route(): ReactElement {
  return (
    <Wormhole10ClientShell>
      <WormholePlanContent />
    </Wormhole10ClientShell>
  );
}
