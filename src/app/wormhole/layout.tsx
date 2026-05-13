import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Julia Wormhole Vortex plan';

export const metadata: Metadata = {
  title,
  description:
    'Lab page for the Julia Wormhole Vortex integration plan: Three.js tunnel with scroll-driven flight.',
  alternates: {
    canonical: '/wormhole',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description:
      'Live Three.js Julia wormhole backdrop with scroll-driven flight.',
    url: '/wormhole',
  },
};

export default function WormholeLayout({ children }: { children: ReactNode }) {
  return children;
}
