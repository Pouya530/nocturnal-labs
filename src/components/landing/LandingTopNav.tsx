import type { ReactElement } from 'react';

import { dmSans } from '@/lib/fonts';

const PORTFOLIO_HREF = 'https://nocturnal.cloud/projects/';
const LABS_HREF = 'https://nocturnal.cloud/labs';
const NOCTURNAL_LABS_HREF = 'https://labs.nocturnal.cloud/';

const iridescentNav =
  'coming-soon-text-iridescent landing-nav-glow text-[12px] font-medium uppercase leading-[1.5] tracking-[0.08em]';

const linkClass = `${iridescentNav} transition-opacity hover:opacity-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400/70`;

/**
 * Fixed top bar: brand (left); Portfolio + Labs (right), matching bottom marquee typography
 * and iridescent gradient treatment.
 */
export function LandingTopNav(): ReactElement {
  return (
    <header
      className={[
        'pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-start justify-between',
        'pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]',
        'pt-[max(1.25rem,env(safe-area-inset-top))]',
        dmSans.className,
      ].join(' ')}
      aria-label="Site"
    >
      <a
        className={linkClass}
        href={NOCTURNAL_LABS_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Nocturnal Labs website"
      >
        Nocturnal Labs
      </a>
      <nav
        className="pointer-events-auto flex items-baseline gap-6 sm:gap-8"
        aria-label="External links"
      >
        <a className={linkClass} href={PORTFOLIO_HREF} target="_blank" rel="noopener noreferrer">
          Portfolio
        </a>
        <a className={linkClass} href={LABS_HREF} target="_blank" rel="noopener noreferrer">
          Labs
        </a>
      </nav>
    </header>
  );
}
