import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';
import { wormholePreviewRobots } from '@/lib/isPreviewRoute';

const title = 'Wormhole 8 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description: 'Julia wormhole lab preview route — atmosphere overlay and tunnel experiments.',
  alternates: {
    canonical: '/wormhole8',
  },
  robots: wormholePreviewRobots,
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Wormhole 8 preview lab.',
    url: '/wormhole8',
  },
};

export default function Wormhole8Layout({ children }: { children: ReactNode }) {
  return children;
}
