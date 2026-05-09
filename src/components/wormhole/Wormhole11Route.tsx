'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole11ClientShell } from '@/components/wormhole/Wormhole11ClientShell';

/** `/wormhole11` — cosmic nebula + wormhole5 tunnel + wormhole9 journey-from-start / micro-intro. */
export function Wormhole11Route(): ReactElement {
  return (
    <Wormhole11ClientShell>
      <WormholePlanContent />
    </Wormhole11ClientShell>
  );
}
