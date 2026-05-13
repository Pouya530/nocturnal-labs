import type { Metadata } from 'next';

/**
 * Lab routes under `/wormhole*` stay **reachable on every deployment** (including production).
 * Discovery is limited via {@link wormholePreviewRobots} and `src/app/robots.ts` — no layout-level
 * `notFound()` so the home page and main app are never tied to preview-route env detection.
 */

/** Shared robots metadata for all `/wormhole*` lab routes (noindex). */
export const wormholePreviewRobots: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};
