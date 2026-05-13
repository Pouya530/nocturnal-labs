import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Julia Wormhole — throat (wormhole3)';

export const metadata: Metadata = {
  title,
  description:
    'Lab page: inverted scroll, zoom-into-throat ring layout, extended ring count and wide spacing.',
  alternates: {
    canonical: '/wormhole3',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Three.js Julia wormhole throat variant with scroll-inverted flight.',
    url: '/wormhole3',
  },
};

export default function Wormhole3Layout({ children }: { children: ReactNode }) {
  return children;
}
