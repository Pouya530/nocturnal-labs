import type { Metadata } from 'next';

/**
 * Metadata `robots` for **`/wormhole*` lab routes only**.
 * The main app (`/`, `/cosmic`, etc.) uses the root layout (`src/app/layout.tsx`) with `index: true` and is unaffected.
 */
export const wormholeLabRobots: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};
