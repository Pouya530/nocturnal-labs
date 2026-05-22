import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';
import { wormholeLabRobots } from '@/lib/wormholeLabSeo';

const title = 'Wormhole 7 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description: 'Julia wormhole lab preview route — scroll-driven tunnel and shell experiments.',
  alternates: {
    canonical: '/wormhole7',
  },
  robots: wormholeLabRobots,
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Wormhole 7 preview lab.',
    url: '/wormhole7',
  },
};

export default function Wormhole7Layout({ children }: { children: ReactNode }) {
  return children;
}
