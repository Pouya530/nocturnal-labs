import type { CSSProperties } from 'react';

import { CinematicHeroStage } from '@/components/landing/CinematicHeroStage';
import { Logo } from '@/components/Hero/Logo';

const heroLogoSize: CSSProperties = { '--hero-logo-size': '440px' } as CSSProperties;

export function ComingSoonHero() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-20 pt-16">
      <CinematicHeroStage>
        <div className="my-2" style={heroLogoSize}>
          <Logo />
        </div>
      </CinematicHeroStage>
    </main>
  );
}
