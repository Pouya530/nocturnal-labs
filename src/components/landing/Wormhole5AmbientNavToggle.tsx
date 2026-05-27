'use client';

import type { CSSProperties, ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import {
  LANDING_NAV_MENU_TRIGGER_LABEL_CLASS,
  LANDING_NAV_TRIGGER_BTN_CLASS,
} from '@/components/landing/landingNavChrome';
import {
  getWormholeAmbientEqualizerBands,
  subscribeWormholeAmbientEqualizer,
} from '@/audio/wormholeAmbientEqualizer';
import {
  isWormhole5AmbientAudioRoute,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
  toggleWormhole5AmbientPlayback,
} from '@/audio/wormhole5AmbientAudio';
import { dmSans } from '@/lib/fonts';

const AMBIENT_ICON_CLASS = 'landing-nav-trigger-icon landing-nav-trigger-icon--ambient';

/** Pause — two iridescent pill bars (CSS gradient + `coming-soon-iridescent`). */
function AmbientPauseIcon(): ReactElement {
  return (
    <span className={`${AMBIENT_ICON_CLASS} landing-nav-trigger-icon--pause`} aria-hidden>
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
      <span className="landing-nav-burger-line landing-nav-burger-line--icon" />
    </span>
  );
}

/** Play — triangle clip on the same gradient + shimmer as pause (no SVG / SMIL). */
function AmbientPlayIcon(): ReactElement {
  return (
    <span className={`${AMBIENT_ICON_CLASS} landing-nav-trigger-icon--play`} aria-hidden>
      <span className="landing-nav-burger-line landing-nav-burger-line--icon landing-nav-burger-line--play-glyph" />
    </span>
  );
}

function useAmbientBassGlow(): number {
  return useSyncExternalStore(
    subscribeWormholeAmbientEqualizer,
    () => {
      const { bass, rms } = getWormholeAmbientEqualizerBands();
      return Math.min(1, bass * 0.85 + rms * 0.15);
    },
    () => 0,
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
  const bassGlow = useAmbientBassGlow();

  if (!enabled) return null;

  const glowStyle: CSSProperties | undefined = playing
    ? ({ '--ambient-bass-glow': String(bassGlow) } as CSSProperties)
    : undefined;

  return (
    <button
      type="button"
      className={[
        LANDING_NAV_TRIGGER_BTN_CLASS,
        'landing-nav-ambient-audio',
        'landing-nav-ambient-audio--wormhole5',
        playing ? 'landing-nav-ambient-audio--playing' : 'landing-nav-ambient-audio--paused',
        dmSans.className,
      ].join(' ')}
      style={glowStyle}
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
