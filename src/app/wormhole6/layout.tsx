import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';

const title = 'Tunnel';

/** Canonical experience lives at `/`; this route mirrors it for bookmarks / labs links. */
export const metadata: Metadata = {
  title,
  description: 'Interactive Julia wormhole tunnel — scroll-flight demo.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Interactive Julia wormhole tunnel.',
    url: '/',
  },
};

export default function Wormhole6Layout({ children }: { children: ReactNode }) {
  return children;
}
