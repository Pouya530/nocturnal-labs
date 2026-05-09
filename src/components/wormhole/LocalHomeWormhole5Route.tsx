'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/**
 * Localhost `/` only — same tunnel stack as `/wormhole5` with production-style footer and no lab HUD.
 */
export function LocalHomeWormhole5Route(): ReactElement {
  return (
    <Wormhole5ClientShell localHomePresentation>
      <WormholePlanContent />
    </Wormhole5ClientShell>
  );
}
