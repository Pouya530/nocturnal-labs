import type { ReactNode } from 'react';

import { CinematicClientShell } from '@/components/landing/CinematicClientShell';

export function LandingShell({ children }: { children: ReactNode }) {
  return <CinematicClientShell>{children}</CinematicClientShell>;
}
