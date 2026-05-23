'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import {
  LANDING_NAV_MENU_TRIGGER_LABEL_CLASS,
  LANDING_NAV_TRIGGER_BTN_CLASS,
  LANDING_NAV_TRIGGER_ICON_CLASS,
} from '@/components/landing/landingNavChrome';
import {
  isWormhole5AmbientAudioRoute,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
  toggleWormhole5AmbientPlayback,
} from '@/audio/wormhole5AmbientAudio';
import { dmSans } from '@/lib/fonts';

/** Pause bars — same iridescent chrome as the burger lines. */
function AmbientPauseIcon(): ReactElement {
  return (
    <span
      className={`${LANDING_NAV_TRIGGER_ICON_CLASS} landing-nav-trigger-icon--pause`}
      aria-hidden
    >
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
    </span>
  );
}

/** Play triangle — same gradient + glow as burger lines. */
function AmbientPlayIcon(): ReactElement {
  return (
    <span
      className={`${LANDING_NAV_TRIGGER_ICON_CLASS} landing-nav-trigger-icon--play landing-nav-burger-line landing-nav-burger-line--icon`}
      aria-hidden
    />
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
      className={[LANDING_NAV_TRIGGER_BTN_CLASS, 'landing-nav-ambient-audio', dmSans.className].join(' ')}
      aria-pressed={playing}
      aria-label={playing ? 'Pause ambient audio' : 'Play ambient audio'}
      onClick={() => toggleWormhole5AmbientPlayback()}
    >
      {playing ? <AmbientPauseIcon /> : <AmbientPlayIcon />}
      <span className={LANDING_NAV_MENU_TRIGGER_LABEL_CLASS}>{playing ? 'PAUSE' : 'AUDIO'}</span>
    </button>
  );
}
