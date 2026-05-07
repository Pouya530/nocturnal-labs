import type { ReactElement } from 'react';

import { dmSans } from '@/lib/fonts';
import type { LandingBackdropMode } from '@/lib/landingBackdropMode';

const PORTFOLIO_HREF = 'https://nocturnal.cloud/projects/';
const LABS_HREF = 'https://nocturnal.cloud/labs';
const NOCTURNAL_LABS_HREF = 'https://labs.nocturnal.cloud/';

const iridescentNav =
  'coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke text-[12px] font-medium uppercase leading-[1.5] tracking-[0.28em]';

const linkClass = `${iridescentNav} transition-opacity hover:opacity-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400/70`;

const segBase =
  'rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.05em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400/80 sm:px-2.5 sm:text-[11px] sm:tracking-[0.06em]';
const segInactive = 'text-zinc-400 hover:text-zinc-200';
const segActive = 'bg-violet-500/25 text-violet-100 shadow-inner';

export type LandingTopNavProps = {
  /** Localhost only: tunnel / classic Julia / vortex variants. */
  backdropToggle?: {
    mode: LandingBackdropMode;
    onChange: (mode: LandingBackdropMode) => void;
  };
};

/**
 * Fixed top bar: brand (left); Portfolio + Labs + optional backdrop mode (right).
 */
export function LandingTopNav({ backdropToggle }: LandingTopNavProps): ReactElement {
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
        className={`pointer-events-auto ${linkClass}`}
        href={NOCTURNAL_LABS_HREF}
        aria-label="Visit Nocturnal Labs website"
      >
        Nocturnal Labs
      </a>
      <div className="pointer-events-auto flex flex-wrap items-baseline justify-end gap-4 sm:gap-6">
        <nav className="flex items-baseline gap-6 sm:gap-8" aria-label="External links">
          <a className={linkClass} href={PORTFOLIO_HREF} target="_blank" rel="noopener noreferrer">
            Portfolio
          </a>
          <a className={linkClass} href={LABS_HREF} target="_blank" rel="noopener noreferrer">
            Labs
          </a>
        </nav>
        {backdropToggle ? (
          <div
            role="radiogroup"
            aria-label="Background fractal"
            className="flex shrink-0 rounded-full border border-white/15 bg-black/45 p-0.5 shadow-sm backdrop-blur-sm"
          >
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'tunnel'}
              className={`${segBase} ${backdropToggle.mode === 'tunnel' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('tunnel')}
            >
              Tunnel
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'original'}
              className={`${segBase} ${backdropToggle.mode === 'original' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('original')}
            >
              Original
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'vortex'}
              className={`${segBase} ${backdropToggle.mode === 'vortex' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('vortex')}
            >
              Vortex
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'vortext2'}
              className={`${segBase} ${backdropToggle.mode === 'vortext2' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('vortext2')}
            >
              Vortext 2
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'vortext3'}
              className={`${segBase} ${backdropToggle.mode === 'vortext3' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('vortext3')}
            >
              Vortext 3
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={backdropToggle.mode === 'vortextunnel'}
              className={`${segBase} ${backdropToggle.mode === 'vortextunnel' ? segActive : segInactive}`}
              onClick={() => backdropToggle.onChange('vortextunnel')}
            >
              Vortext Tunnel
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
