import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Julia Wormhole — growth inversion lab';

export const metadata: Metadata = {
  title,
  description:
    'Classic Julia wormhole with inverted ring scaling (WORMHOLE_GROWTH_INVERSION_FIX_1): shared unit ring geometry and per-frame scale.',
  alternates: {
    canonical: '/wormhole4',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description:
      'Three.js Julia wormhole lab: inverted growth curve and recycle fades.',
    url: '/wormhole4',
  },
};

export default function Wormhole4Layout({ children }: { children: ReactNode }) {
  return children;
}
