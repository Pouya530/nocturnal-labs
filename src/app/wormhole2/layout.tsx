import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Julia vortex + wormhole lab';

export const metadata: Metadata = {
  title,
  description: 'Vortex-twist Julia shader with optional Three.js wormhole tube; scroll-driven flight.',
  alternates: {
    canonical: '/wormhole2',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Combined Julia vortex and wormhole backdrop.',
    url: '/wormhole2',
  },
};

export default function Wormhole2Layout({ children }: { children: ReactNode }) {
  return children;
}
