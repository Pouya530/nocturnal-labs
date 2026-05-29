'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { AmbientAudioGlyph } from '@/components/landing/AmbientAudioGlyph';
import {
  LANDING_NAV_MENU_TRIGGER_LABEL_CLASS,
  LANDING_NAV_TRIGGER_BTN_CLASS,
} from '@/components/landing/landingNavChrome';
import {
  isWormhole5AmbientAudioRoute,
  isWormhole5AmbientLoading,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
  toggleWormhole5AmbientPlayback,
} from '@/audio/wormhole5AmbientAudio';
import { dmSans } from '@/lib/fonts';

const AMBIENT_ICON_CLASS = 'landing-nav-trigger-icon landing-nav-trigger-icon--ambient';

/** Home `/` + `/wormhole5` — pause/play ambient loop beside MENU (`NOCTURNAL_LABS_NAV_AUDIO_TOGGLE_UX_UI_3.md`). */
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
  const loading = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    () => isWormhole5AmbientLoading(),
    () => false,
  );

  const liveRef = useRef<HTMLSpanElement>(null);
  const prevPlaying = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || prevPlaying.current === null) {
      prevPlaying.current = playing;
      return;
    }
    if (prevPlaying.current === playing) return;
    prevPlaying.current = playing;
    const el = liveRef.current;
    if (!el) return;
    el.textContent = playing ? 'Audio playing' : 'Audio paused';
  }, [enabled, playing]);

  if (!enabled) return null;

  const showPause = playing && !loading;

  return (
    <button
      type="button"
      className={[
        LANDING_NAV_TRIGGER_BTN_CLASS,
        'landing-nav-ambient-audio',
        'landing-nav-ambient-audio--wormhole5',
        showPause ? 'landing-nav-ambient-audio--playing' : 'landing-nav-ambient-audio--paused',
        loading ? 'landing-nav-ambient-audio--loading' : '',
        dmSans.className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={showPause}
      aria-busy={loading || undefined}
      aria-label={
        loading
          ? 'Loading ambient audio'
          : showPause
            ? 'Pause ambient audio'
            : 'Play ambient audio'
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWormhole5AmbientPlayback();
      }}
    >
      <span className={AMBIENT_ICON_CLASS}>
        <AmbientAudioGlyph playing={showPause} />
      </span>
      <span className={LANDING_NAV_MENU_TRIGGER_LABEL_CLASS}>
        {loading ? 'AUDIO' : showPause ? 'PAUSE' : 'AUDIO'}
      </span>
      <span ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
    </button>
  );
}
