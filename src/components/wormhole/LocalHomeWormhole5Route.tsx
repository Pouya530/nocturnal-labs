'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/**
 * Production `/` and localhost dev — wormhole5 tunnel, marquee footer, ambient audio + ENTER preloader (no lab HUD).
 */
export function LocalHomeWormhole5Route(): ReactElement {
  return (
    <Wormhole5ClientShell localHomePresentation>
      <WormholePlanContent />
    </Wormhole5ClientShell>
  );
}
