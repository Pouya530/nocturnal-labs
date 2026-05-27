import type { ReactElement, ReactNode } from 'react';
import Link from 'next/link';

import { MobileBurgerNav } from '@/components/landing/MobileBurgerNav';
import { LANDING_NAV_LABEL_CLASS } from '@/components/landing/landingNavChrome';
import { NOCTURNAL_LABS_HREF } from '@/components/landing/landingNavLinks';
import { NL_BOOT_HIDE_CHROME_CLASS } from '@/lib/nlBootChromeCover';
import { dmSans } from '@/lib/fonts';

const linkClass = LANDING_NAV_LABEL_CLASS;

/** Matches fixed burger row height so “Nocturnal Labs” and MENU/CLOSE share one vertical rhythm. */
const NAV_CHROME_ROW_MIN_H = 'min-h-11';
/**
 * Reserve space for AUDIO + MENU on larger viewports.
 * On phones a fixed ~19rem min-width squeezed the brand into two lines — scale with breakpoint.
 */
const NAV_RIGHT_CLUSTER_MIN_W =
  'min-w-0 shrink-0 sm:min-w-[11.5rem] md:min-w-[15rem] lg:min-w-[19rem]';

/**
 * Fixed top bar: brand (left); universal menu trigger (right).
 */
export function LandingTopNav({ menuPrepend }: { menuPrepend?: ReactNode }): ReactElement {
  return (
    <header
      className={[
        NL_BOOT_HIDE_CHROME_CLASS,
        'pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center justify-between',
        'pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]',
        'pt-1',
        dmSans.className,
      ].join(' ')}
      aria-label="Site"
    >
      <Link
        className={`pointer-events-auto inline-flex ${NAV_CHROME_ROW_MIN_H} items-center whitespace-nowrap ${linkClass} max-sm:text-[11px] max-sm:tracking-[0.15em]`}
        href={NOCTURNAL_LABS_HREF}
        aria-label="Nocturnal Labs — home"
      >
        Nocturnal Labs
      </Link>
      <div
        className={`pointer-events-auto flex ${NAV_CHROME_ROW_MIN_H} ${NAV_RIGHT_CLUSTER_MIN_W} shrink-0 items-center justify-end`}
      >
        <MobileBurgerNav prepend={menuPrepend} />
      </div>
    </header>
  );
}
