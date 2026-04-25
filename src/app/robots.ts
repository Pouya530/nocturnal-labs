import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

const disallow = ['/api/', '/_next/', '/private/'];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const hostname = (() => {
    try {
      const h = new URL(base).hostname;
      return h && h !== 'localhost' ? h : undefined;
    } catch {
      return undefined;
    }
  })();

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: disallow },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    ...(hostname ? { host: hostname } : {}),
  };
}
