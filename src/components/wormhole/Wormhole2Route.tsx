'use client';

import type { ReactElement } from 'react';

import { Wormhole2ClientShell } from '@/components/wormhole/Wormhole2ClientShell';
import { Wormhole2PlanContent } from '@/components/wormhole/Wormhole2PlanContent';

/** `/wormhole2` — Julia vortex twist + optional Three.js wormhole tube. */
export function Wormhole2Route(): ReactElement {
  return (
    <Wormhole2ClientShell>
      <Wormhole2PlanContent />
    </Wormhole2ClientShell>
  );
}
