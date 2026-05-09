import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Cosmic — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description:
    'Experimental volumetric nebula tunnel with Julia-fractal density blend — preview route.',
  alternates: {
    canonical: '/cosmic',
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Volumetric cosmic backdrop with Cymatics palette and scroll-driven depth.',
    url: '/cosmic',
  },
};

export default function CosmicLayout({ children }: { children: ReactNode }) {
  return children;
}
