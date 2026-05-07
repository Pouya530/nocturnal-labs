import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { Logo } from '@/components/Hero/Logo';

export function ComingSoonHero() {
  const devScaleClass = process.env.NODE_ENV === 'development' ? '[--hero-logo-scale:1.625]' : '';
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-visible px-6 py-24">
      <h1 className="sr-only">{`Nocturnal Labs — full-service digital agency`}</h1>
      <CinematicHeroStage>
        <div className={['hero-logo-size-var', devScaleClass, 'my-2'].join(' ')}>
          <Logo />
        </div>
      </CinematicHeroStage>
    </main>
  );
}
