/**
 * Canonical origin for metadata, sitemap, robots, and JSON-LD absolute URLs.
 *
 * Set **`NEXT_PUBLIC_SITE_URL`** in production (e.g. `https://your-domain.com`) so
 * canonicals and social cards never point at transient preview hosts.
 *
 * Resolution order: `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
 * `VERCEL_URL` (previews) → local dev default.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return 'https://nocturnal-labs.vercel.app';
}
