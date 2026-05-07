import dynamic from 'next/dynamic';

/**
 * Mirrors `/`: fullscreen helix wormhole + `fullscreenBleed` atmosphere (no site preloader sweep).
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
