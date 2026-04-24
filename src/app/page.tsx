import { ComingSoonHero } from '@/components/landing/ComingSoonHero';
import { LandingShell } from '@/components/landing/LandingShell';

export default function Home() {
  return (
    <LandingShell>
      <ComingSoonHero />
    </LandingShell>
  );
}
