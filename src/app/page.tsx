import dynamic from 'next/dynamic';

const loadingFallback = (
  <div className="min-h-[100dvh] w-full bg-[#030208]" aria-hidden />
);

/**
 * Home `/` — {@link LocalHomeWormhole5Route}: wormhole5 tunnel, marquee footer, ambient audio + ENTER preloader.
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
