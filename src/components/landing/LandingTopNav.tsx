import type { ReactElement } from 'react';
import Link from 'next/link';

import { MobileBurgerNav } from '@/components/landing/MobileBurgerNav';
import { LANDING_NAV_LABEL_CLASS } from '@/components/landing/landingNavChrome';
import { NOCTURNAL_LABS_HREF } from '@/components/landing/landingNavLinks';
import { NL_BOOT_HIDE_CHROME_CLASS } from '@/lib/nlBootChromeCover';
import { dmSans } from '@/lib/fonts';

const linkClass = LANDING_NAV_LABEL_CLASS;

/** Matches fixed burger row height so “Nocturnal Labs” and MENU/CLOSE share one vertical rhythm. */
const NAV_CHROME_ROW_MIN_H = 'min-h-11';
/** Reserve space for the portaled trigger so `justify-between` clears the right inset (bars + gap + label). */
const BURGER_SLOT_MIN_W = 'min-w-[8rem]';

/**
 * Fixed top bar: brand (left); universal menu trigger (right).
 */
export function LandingTopNav(): ReactElement {
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
        className={`pointer-events-auto inline-flex ${NAV_CHROME_ROW_MIN_H} items-center ${linkClass}`}
        href={NOCTURNAL_LABS_HREF}
        aria-label="Nocturnal Labs — home"
      >
        Nocturnal Labs
      </Link>
      <div
        className={`pointer-events-auto flex ${NAV_CHROME_ROW_MIN_H} ${BURGER_SLOT_MIN_W} shrink-0 items-center justify-end`}
      >
        <MobileBurgerNav />
      </div>
    </header>
  );
}
