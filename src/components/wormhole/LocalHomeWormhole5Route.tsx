'use client';

import type { ReactElement } from 'react';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole5ClientShell } from '@/components/wormhole/Wormhole5ClientShell';

/**
 * Home `/` — same {@link Wormhole5ClientShell} stack and tunnel tuning as `/wormhole5`, without lab HUD
 * (no locked/free toggle, no tunnel debug). Marquee footer, ambient audio + ENTER preloader.
 */
export function LocalHomeWormhole5Route(): ReactElement {
  return (
    <Wormhole5ClientShell localHomePresentation>
      <WormholePlanContent />
    </Wormhole5ClientShell>
  );
}
