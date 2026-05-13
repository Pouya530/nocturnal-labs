import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Wormhole 10 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description:
    'Julia helix lab with wormhole5 ring stack and volumetric cosmic nebula behind the tunnel — preview route.',
  alternates: {
    canonical: '/wormhole10',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Helix lab + inverted rings with cosmic volumetric backdrop.',
    url: '/wormhole10',
  },
};

export default function Wormhole10Layout({ children }: { children: ReactNode }) {
  return children;
}
