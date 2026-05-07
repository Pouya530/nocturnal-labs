'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole6ClientShell } from '@/components/wormhole/Wormhole6ClientShell';

/** Production home tunnel: same stack as `/wormhole5` without lab HUD/debug; velocity-synced footer marquee. */
export function Wormhole6Route(): ReactElement {
  return (
    <Wormhole6ClientShell>
      <WormholePlanContent />
    </Wormhole6ClientShell>
  );
}
