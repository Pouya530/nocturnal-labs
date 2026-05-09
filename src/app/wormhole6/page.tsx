import dynamic from 'next/dynamic';

/**
 * Mirrors `/`: same {@link Wormhole6Route} tunnel (fullscreen helix, wormhole5-style ribbons, inversion rings, journey),
 * site preloader, and subtle throat-style zoom-out + coin fade.
 * Canonical URL remains `/` (see `layout.tsx`); keeps bookmarks sharing `/wormhole6`.
 */
const TunnelMirrorExperience = dynamic(
  () =>
    import('@/components/wormhole/Wormhole6Route').then((mod) => ({ default: mod.Wormhole6Route })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] w-full bg-[#030208]" aria-hidden />
    ),
  },
);

export default function Wormhole6MirrorPage() {
  return <TunnelMirrorExperience />;
}
