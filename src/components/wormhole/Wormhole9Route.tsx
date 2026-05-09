'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole9ClientShell } from '@/components/wormhole/Wormhole9ClientShell';

/** `/wormhole9` — wormhole5 GL + journey-from-start; homepage candidate preview route. */
export function Wormhole9Route(): ReactElement {
  return (
    <Wormhole9ClientShell>
      <WormholePlanContent />
    </Wormhole9ClientShell>
  );
}
