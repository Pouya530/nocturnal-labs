import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { dmSans } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nocturnal Labs',
  description: 'Nocturnal Labs — coming soon.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
