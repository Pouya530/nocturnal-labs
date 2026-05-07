'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { motionPrefs } from '@/core/motion';
import { dmSans } from '@/lib/fonts';
import { tunnelStore } from '@/tunnel/tunnelStore';

const segment =
  "We Are a Full-Service Agency Crafting Standout Digital Experiences for the World's Leading Brands · © 2026 Nocturnal Labs · ";

const announcement =
  "We Are a Full-Service Agency Crafting Standout Digital Experiences for the World's Leading Brands · © 2026 Nocturnal Labs";

const announcementA11y = announcement.toUpperCase();

/**
 * Same horizontal marquee as {@link ComingSoonBanner}, but scroll position is driven by the same
 * `velocity` / `wormholeScrollVisualMul` rules as `LogoCoin` spinSyncScroll (rad/s → px/s).
 */
export function WormholeCoinSyncedMarqueeFooter(): ReactElement {
  const reduced = useSyncExternalStore(
    motionPrefs.subscribe,
    () => motionPrefs.reduced,
    () => false,
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const offRef = useRef(0);
  const periodRef = useRef(4000);

  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    let last = performance.now();

    const measure = () => {
      const w = track.scrollWidth;
      periodRef.current = Math.max(320, w * 0.5);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    /** Matches `LogoCoin` `spinSyncScroll` branch: `w` rad/s × `dir` → marquee px/s. */
    const PIX_PER_RAD_S = 108;

    const tick = (t: number) => {
      const dt = Math.min((t - last) * 0.001, 0.05);
      last = t;

      const s = tunnelStore.getState();
      const v = s.velocity;
      const av = Math.abs(v);
      const scrollBoost = Math.min(av * 0.038, 4.2);
      const w = 0.62 + scrollBoost;
      const visMul = s.wormholeScrollVisualMul ?? 1;
      const dir = (av < 0.06 ? 1 : Math.sign(v)) * visMul;

      const period = periodRef.current;
      let x = offRef.current;
      x += w * dir * PIX_PER_RAD_S * dt;
      while (x <= -period) x += period;
      while (x > 0) x -= period;
      offRef.current = x;
      track.style.transform = `translate3d(${x.toFixed(3)}px, 0, 0)`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

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
        <div
          ref={trackRef}
          className="coming-soon-marquee-track coming-soon-marquee-track--wormhole-velocity flex w-max items-center will-change-transform"
        >
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
