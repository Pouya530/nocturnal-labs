'use client';

import type { ReactElement } from 'react';
import { useId, useSyncExternalStore } from 'react';

import {
  LANDING_NAV_MENU_TRIGGER_LABEL_CLASS,
  LANDING_NAV_TRIGGER_BTN_CLASS,
} from '@/components/landing/landingNavChrome';
import {
  isWormhole5AmbientAudioRoute,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
  toggleWormhole5AmbientPlayback,
} from '@/audio/wormhole5AmbientAudio';
import { dmSans } from '@/lib/fonts';

const AMBIENT_ICON_CLASS = 'landing-nav-trigger-icon landing-nav-trigger-icon--ambient';

/** Pause — two iridescent pill bars (same slot as play). */
function AmbientPauseIcon(): ReactElement {
  return (
    <span className={`${AMBIENT_ICON_CLASS} landing-nav-trigger-icon--pause`} aria-hidden>
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
    </span>
  );
}

/**
 * Play control — SVG triangle + `linearGradient` (iOS Safari often paints `background-clip: text`
 * on ▶ as a solid square; SVG fill stays sharp at any DPR).
 */
function AmbientPlayIcon(): ReactElement {
  const uid = useId().replace(/:/g, '');
  const gradId = `nl-ambient-play-grad-${uid}`;
  return (
    <span className={`${AMBIENT_ICON_CLASS} landing-nav-trigger-icon--play`} aria-hidden>
      <span className="landing-nav-ambient-play-svg" aria-hidden>
        <svg
          className="landing-nav-ambient-play-svg__inner"
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
          focusable="false"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ff0080" />
              <stop offset="12%" stopColor="#c026d3" />
              <stop offset="24%" stopColor="#7c3aed" />
              <stop offset="36%" stopColor="#2563eb" />
              <stop offset="48%" stopColor="#0ea5e9" />
              <stop offset="60%" stopColor="#14b8a6" />
              <stop offset="72%" stopColor="#22c55e" />
              <stop offset="84%" stopColor="#eab308" />
              <stop offset="92%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ff0080" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-24 0;24 0;-24 0"
                dur="14s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          <path d="M8 5.5v13L19 12 8 5.5Z" fill={`url(#${gradId})`} />
        </svg>
      </span>
    </span>
  );
}

/** Home `/` + `/wormhole5` — pause/play ambient loop beside MENU. */
export function Wormhole5AmbientNavToggle(): ReactElement | null {
  const enabled = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    () => isWormhole5AmbientAudioRoute(),
    () => false,
  );
  const playing = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    () => isWormhole5AmbientPlaying(),
    () => false,
  );

  if (!enabled) return null;

  return (
    <button
      type="button"
      className={[
        LANDING_NAV_TRIGGER_BTN_CLASS,
        'landing-nav-ambient-audio',
        'landing-nav-ambient-audio--wormhole5',
        dmSans.className,
      ].join(' ')}
      aria-pressed={playing}
      aria-label={playing ? 'Pause ambient audio' : 'Play ambient audio'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWormhole5AmbientPlayback();
      }}
    >
      {playing ? <AmbientPauseIcon /> : <AmbientPlayIcon />}
      <span className={LANDING_NAV_MENU_TRIGGER_LABEL_CLASS}>{playing ? 'PAUSE' : 'AUDIO'}</span>
    </button>
  );
}
