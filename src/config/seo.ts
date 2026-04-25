/**
 * Public SEO copy — single source for layout metadata and JSON-LD text.
 * Do not store secrets here; use environment variables for analytics IDs.
 */

export const SITE_NAME = 'Nocturnal Labs';

/** Target ≤60 characters for Google title display */
export const SEO_TITLE_DEFAULT = 'Nocturnal Labs | AI, R&D & Advanced Technology Innovation';

/** Target ≤160 characters */
export const SEO_DESCRIPTION =
  'Explore Nocturnal Labs, Nocturnal Cloud’s dedicated space for AI research, advanced technology and experimental R&D, showcasing future-focused innovation, immersive digital concepts and high-tech exploration.';

export const SEO_KEYWORDS = [
  'Nocturnal Labs',
  'AI',
  'R&D',
  'Advanced Technology Innovation',
  'AI research',
  'advanced technology',
  'experimental R&D',
  'future-focused innovation',
  'immersive digital concepts',
  'high-tech exploration',
  'Nocturnal Cloud',
] as const;

export const OG_LOCALE = 'en_GB';

/**
 * GA4 measurement ID from env only — avoids committing IDs and lets forks disable analytics.
 * Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` on Vercel (Production + Preview if desired).
 */
export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}
