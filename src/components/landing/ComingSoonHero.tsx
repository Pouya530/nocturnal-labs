import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { Logo } from '@/components/Hero/Logo';

export function ComingSoonHero() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-visible px-6 pb-28 pt-16">
      <h1 className="sr-only">{`Nocturnal Labs — full-service digital agency`}</h1>
      <CinematicHeroStage>
        <div className="hero-logo-size-var my-2">
          <Logo />
        </div>
      </CinematicHeroStage>
    </main>
  );
}
