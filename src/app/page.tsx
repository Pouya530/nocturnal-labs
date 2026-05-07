import dynamic from 'next/dynamic';

/**
 * Production home: wormhole tunnel + coin (same stack as former `/wormhole6`).
 * Client-only + dynamic import so the server page shell stays light; SEO comes from `layout.tsx`.
 */
const HomeTunnelExperience = dynamic(
  () =>
    import('@/components/wormhole/Wormhole6Route').then((mod) => ({ default: mod.Wormhole6Route })),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[100dvh] w-full bg-[#030208]"
        aria-hidden
      />
    ),
  },
);

export default function Home() {
  return <HomeTunnelExperience />;
}
