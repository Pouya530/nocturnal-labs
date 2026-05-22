import dynamic from 'next/dynamic';

/**
 * Lab preview — {@link Wormhole6Route} (fullscreen helix, inversion rings, journey). Canonical home is `/`
 * ({@link LocalHomeWormhole5Route}, same as localhost:3001 dev).
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
