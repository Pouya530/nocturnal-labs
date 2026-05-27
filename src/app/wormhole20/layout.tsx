import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/config/seo';
import { wormholeLabRobots } from '@/lib/wormholeLabSeo';

const title = 'Wormhole 20 — Nocturnal Labs';

export const metadata: Metadata = {
  title,
  description:
    'Dev lab (localhost:3001): wormhole5 stack with ambient MP3 timeline sync and FFT-reactive Julia equalizer.',
  alternates: {
    canonical: '/wormhole20',
  },
  robots: wormholeLabRobots,
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: 'Wormhole5 + ambient timeline sync + Web Audio equalizer-driven Julia shaders.',
    url: '/wormhole20',
  },
};

export default function Wormhole20Layout({ children }: { children: ReactNode }) {
  return children;
}
