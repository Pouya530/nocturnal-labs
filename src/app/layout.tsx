import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { JsonLd } from '@/components/seo/JsonLd';
import { dmSans } from '@/lib/fonts';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

const site = getSiteUrl();

const titleDefault = 'Nocturnal Labs — Digital experiences studio';
const description =
  'Nocturnal Labs is a full-service agency crafting standout digital experiences for leading brands. Portfolio, labs, and launches.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: titleDefault,
    template: '%s | Nocturnal Labs',
  },
  description,
  keywords: [
    'Nocturnal Labs',
    'digital agency',
    'web design',
    'creative technology',
    'Nocturnal Cloud',
    'UX',
    'brand experiences',
  ],
  authors: [{ name: 'Nocturnal Labs', url: site }],
  creator: 'Nocturnal Labs',
  publisher: 'Nocturnal Labs',
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: site,
    siteName: 'Nocturnal Labs',
    title: titleDefault,
    description,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Nocturnal Labs — landing preview with neon corners and coin mark',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: titleDefault,
    description,
    images: ['/twitter-image'],
  },
  icons: {
    icon: [
      { url: '/nocturnal-labs-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/nocturnal-labs-logo.png', sizes: '16x16', type: 'image/png' },
      { url: '/nocturnal-labs-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/nocturnal-labs-logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/nocturnal-labs-logo.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'theme-color': '#020204',
  },
};

export const viewport: Viewport = {
  themeColor: '#020204',
  width: 'device-width',
  initialScale: 1,
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'Nocturnal Labs',
      url: site,
      logo: `${site}/brand/nocturnal-labs-logo.png`,
      description,
      sameAs: ['https://nocturnal.cloud/', 'https://nocturnal.cloud/projects/', 'https://nocturnal.cloud/labs/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      name: 'Nocturnal Labs',
      url: site,
      description,
      inLanguage: 'en-GB',
      publisher: { '@id': `${site}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${site}/#webpage`,
      name: titleDefault,
      description,
      url: site,
      isPartOf: { '@id': `${site}/#website` },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={dmSans.variable}>
      <body>
        <JsonLd data={structuredData} />
        {children}
      </body>
    </html>
  );
}
