'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/**
 * Production `/` and localhost dev — same tunnel stack as `/wormhole5` with marquee footer and no lab HUD.
 */
export function LocalHomeWormhole5Route(): ReactElement {
  return (
    <Wormhole5ClientShell localHomePresentation>
      <WormholePlanContent />
    </Wormhole5ClientShell>
  );
}
