import type { ReactElement } from 'react';

import { dmSans } from '@/lib/fonts';

const segment =
  "We Are a Full-Service Agency Crafting Standout Digital Experiences for the World's Leading Brands...launching soon! © 2026 Nocturnal Labs · ";

const announcement =
  "We Are a Full-Service Agency Crafting Standout Digital Experiences for the World's Leading Brands...launching soon! © 2026 Nocturnal Labs";

const announcementA11y = announcement.toUpperCase();

/**
 * Full-width bottom marquee; type uses DM Sans per design spec. Static / centered
 * copy is shown when `prefers-reduced-motion: reduce` (see globals.css).
 */
export function ComingSoonBanner(): ReactElement {
  return (
    <div
      className={[
        'coming-soon-banner-shell fixed bottom-0 left-0 right-0 z-20 py-2',
        dmSans.className,
      ].join(' ')}
      role="region"
      aria-label={announcementA11y}
    >
      <div className="coming-soon-marquee-motion">
        <div className="coming-soon-marquee-track flex w-max items-center">
          <span
            className="coming-soon-text-iridescent inline-block shrink-0 whitespace-nowrap text-[12px] uppercase leading-[1.5] tracking-[0.08em]"
            aria-hidden
          >
            {segment.repeat(4)}
          </span>
          <span
            className="coming-soon-text-iridescent inline-block shrink-0 whitespace-nowrap text-[12px] uppercase leading-[1.5] tracking-[0.08em]"
            aria-hidden
          >
            {segment.repeat(4)}
          </span>
        </div>
      </div>
      <p className="coming-soon-text-iridescent coming-soon-marquee-static mx-auto max-w-5xl px-4 py-0.5 text-center text-balance text-[12px] uppercase leading-snug tracking-[0.08em]">
        {announcement}
      </p>
    </div>
  );
}
