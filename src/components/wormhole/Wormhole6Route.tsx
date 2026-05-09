'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole6ClientShell } from '@/components/wormhole/Wormhole6ClientShell';

/** Production home tunnel for `/` and `/wormhole6`: {@link Wormhole6ClientShell} (fullscreen helix, wormhole5-style ribbons, rings + journey). */
export function Wormhole6Route(): ReactElement {
  return (
    <Wormhole6ClientShell>
      <WormholePlanContent />
    </Wormhole6ClientShell>
  );
}
