import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';
import { wormholeLabRobots } from '@/lib/wormholeLabSeo';

const title = 'Wormhole 9 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description:
    'Julia helix lab with intro ring reveal and homepage-style journey camera — preview route for the next homepage tunnel.',
  alternates: {
    canonical: '/wormhole9',
  },
  robots: wormholeLabRobots,
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: '3D helix lab with ring-mouth reveal and intro camera journey.',
    url: '/wormhole9',
  },
};

export default function Wormhole9Layout({ children }: { children: ReactNode }) {
  return children;
}
