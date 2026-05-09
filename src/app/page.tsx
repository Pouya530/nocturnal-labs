import dynamic from 'next/dynamic';
import { headers } from 'next/headers';

import { isLocalhostHostHeader } from '@/lib/isLocalhost';

const loadingFallback = (
  <div className="min-h-[100dvh] w-full bg-[#030208]" aria-hidden />
);

/**
 * Production home: wormhole tunnel + coin via {@link Wormhole6Route} (same stack as `/wormhole6`).
 * Localhost: `/wormhole5` stack + marquee footer, no bottom-left mode toggle or tunnel debug panel.
 * Client-only + dynamic import so the server page shell stays light; SEO comes from `layout.tsx`.
 */
const HomeTunnelExperience = dynamic(
  () =>
    import('@/components/wormhole/Wormhole6Route').then((mod) => ({ default: mod.Wormhole6Route })),
  {
    ssr: false,
    loading: () => loadingFallback,
  },
);

const LocalHomeWormhole5Experience = dynamic(
  () =>
    import('@/components/wormhole/LocalHomeWormhole5Route').then((mod) => ({
      default: mod.LocalHomeWormhole5Route,
    })),
  {
    ssr: false,
    loading: () => loadingFallback,
  },
);

export default function Home() {
  const host = headers().get('host') ?? '';
  if (isLocalhostHostHeader(host)) {
    return <LocalHomeWormhole5Experience />;
  }
  return <HomeTunnelExperience />;
}
