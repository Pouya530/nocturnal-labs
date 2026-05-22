import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';
import { wormholeLabRobots } from '@/lib/wormholeLabSeo';

const title = 'Wormhole 11 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description:
    'Cosmic volumetric backdrop with wormhole5 Julia tunnel and wormhole9-style intro camera journey — preview route.',
  alternates: {
    canonical: '/wormhole11',
  },
  robots: wormholeLabRobots,
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Helix lab, cosmic nebula, and homepage-style intro camera ramp.',
    url: '/wormhole11',
  },
};

export default function Wormhole11Layout({ children }: { children: ReactNode }) {
  return children;
}
