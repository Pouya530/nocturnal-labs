import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';

import { JsonLd } from '@/components/seo/JsonLd';
import {
  OG_LOCALE,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE_DEFAULT,
  SITE_NAME,
  getGaMeasurementId,
} from '@/config/seo';
import { dmSans } from '@/lib/fonts';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

const site = getSiteUrl();
const gaId = getGaMeasurementId();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: SITE_NAME,
  title: {
    default: SEO_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SEO_DESCRIPTION,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: SITE_NAME, url: site }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'business',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
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
    locale: OG_LOCALE,
    url: site,
    siteName: SITE_NAME,
    title: SEO_TITLE_DEFAULT,
    description: SEO_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — preview card with neon corners and coin mark`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE_DEFAULT,
    description: SEO_DESCRIPTION,
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
      name: SITE_NAME,
      url: site,
      logo: `${site}/brand/nocturnal-labs-logo.png`,
      description: SEO_DESCRIPTION,
      sameAs: ['https://nocturnal.cloud/', 'https://nocturnal.cloud/projects/', 'https://nocturnal.cloud/labs/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      name: SITE_NAME,
      url: site,
      description: SEO_DESCRIPTION,
      inLanguage: OG_LOCALE,
      publisher: { '@id': `${site}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${site}/#webpage`,
      name: SEO_TITLE_DEFAULT,
      description: SEO_DESCRIPTION,
      url: site,
      inLanguage: OG_LOCALE,
      isPartOf: { '@id': `${site}/#website` },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={dmSans.variable}>
      <head>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="google-tag-gtag" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
      </head>
      <body>
        <JsonLd data={structuredData} />
        {children}
      </body>
    </html>
  );
}
