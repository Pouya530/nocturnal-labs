'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

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
 * Play glyph — same iridescent stack as the AUDIO label (`background-clip: text`).
 * WebKit often omits clip-path + SVG gradient shapes in the nav cluster; text clip is reliable.
 */
function AmbientPlayIcon(): ReactElement {
  return (
    <span className={`${AMBIENT_ICON_CLASS} landing-nav-trigger-icon--play`} aria-hidden>
      <span
        className="landing-nav-ambient-play-glyph coming-soon-text-iridescent landing-nav-glow landing-nav-text-stroke"
        style={{ paddingTop: 0, paddingBottom: 0 }}
        aria-hidden
      >
        ▶
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
