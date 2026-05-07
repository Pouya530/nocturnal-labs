import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Julia helix lab + intro ring reveal';

export const metadata: Metadata = {
  title,
  description:
    'Wormhole2 helix lab variant with front-loaded classic rings that reveal the helix tunnel as you scroll.',
  alternates: {
    canonical: '/wormhole5',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: '3D helix lab with ring-mouth reveal transition.',
    url: '/wormhole5',
  },
};

export default function Wormhole5Layout({ children }: { children: ReactNode }) {
  return children;
}
