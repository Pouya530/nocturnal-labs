import dynamic from 'next/dynamic';

const loadingFallback = (
  <div className="min-h-[100dvh] w-full bg-[#030208]" aria-hidden />
);

/**
 * Home `/` — same stack as localhost dev (`npm run dev` on port 3001):
 * {@link LocalHomeWormhole5Route} (wormhole5 tunnel, marquee footer, no lab HUD).
 */
const HomeExperience = dynamic(
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
  return <HomeExperience />;
}
