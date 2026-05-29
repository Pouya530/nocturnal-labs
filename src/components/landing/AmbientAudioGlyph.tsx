'use client';

import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import {
  AMBIENT_GLYPH_PAUSE_PATH,
  AMBIENT_GLYPH_PLAY_PATH,
  AMBIENT_GLYPH_PLAY_TO_PAUSE_FRAMES,
  ambientGlyphPathAtMorphProgress,
} from '@/lib/ambientAudioGlyphPaths';
import { easeAmbientGlyphMorph } from '@/lib/easeMorph';
import { motionPrefs } from '@/core/motion';

const MORPH_MS = 280;

type AmbientAudioGlyphProps = {
  /** `true` when ambient is playing — shows pause bars. */
  playing: boolean;
};

function subscribeReducedMotion(listener: () => void): () => void {
  return motionPrefs.subscribe(listener);
}

function getReducedMotion(): boolean {
  return motionPrefs.reduced;
}

function getServerReducedMotion(): boolean {
  return false;
}

/** Unified inline SVG play/pause with shared shimmer + SVG shadow (`NOCTURNAL_LABS_NAV_AUDIO_TOGGLE_SVG_UNIFIED.md`). */
export function AmbientAudioGlyph({ playing }: AmbientAudioGlyphProps): ReactElement {
  const uid = useId();
  const gradientId = `nav-shimmer${uid.replace(/:/g, '')}`;
  const shadowId = `nav-shadow${uid.replace(/:/g, '')}`;

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  const targetPath = playing ? AMBIENT_GLYPH_PAUSE_PATH : AMBIENT_GLYPH_PLAY_PATH;
  const [pathD, setPathD] = useState(targetPath);
  const pathRef = useRef(targetPath);
  const playingRef = useRef(playing);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (playingRef.current === playing) {
      if (reducedMotion) {
        const snapped = playing ? AMBIENT_GLYPH_PAUSE_PATH : AMBIENT_GLYPH_PLAY_PATH;
        if (pathRef.current !== snapped) {
          pathRef.current = snapped;
          setPathD(snapped);
        }
      }
      return;
    }

    const toPause = playing;
    playingRef.current = playing;
    const frames = toPause
      ? AMBIENT_GLYPH_PLAY_TO_PAUSE_FRAMES
      : [...AMBIENT_GLYPH_PLAY_TO_PAUSE_FRAMES].reverse();

    if (reducedMotion) {
      const snapped = toPause ? AMBIENT_GLYPH_PAUSE_PATH : AMBIENT_GLYPH_PLAY_PATH;
      setPathD(snapped);
      pathRef.current = snapped;
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / MORPH_MS);
      const eased = easeAmbientGlyphMorph(raw);
      const next = ambientGlyphPathAtMorphProgress(frames, eased);
      setPathD(next);
      pathRef.current = next;

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        const finalPath = toPause ? AMBIENT_GLYPH_PAUSE_PATH : AMBIENT_GLYPH_PLAY_PATH;
        setPathD(finalPath);
        pathRef.current = finalPath;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, reducedMotion]);

  return (
    <svg
      className="landing-nav-ambient-glyph-svg"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff0080" />
          <stop offset="14%" stopColor="#e94bd8" />
          <stop offset="28%" stopColor="#9b6bff" />
          <stop offset="42%" stopColor="#4fb8ff" />
          <stop offset="56%" stopColor="#5be8e8" />
          <stop offset="70%" stopColor="#7eff8f" />
          <stop offset="84%" stopColor="#f4e4c1" />
          <stop offset="100%" stopColor="#ff0080" />
          {!reducedMotion ? (
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-24 0"
              to="24 0"
              dur="14s"
              repeatCount="indefinite"
            />
          ) : null}
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.92" />
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.62" />
          <feDropShadow dx="0" dy="4" stdDeviation="7" floodColor="#000000" floodOpacity="0.38" />
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#8b5cf6" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="0" stdDeviation="11" floodColor="#ec4899" floodOpacity="0.22" />
        </filter>
      </defs>
      <path
        className="landing-nav-ambient-glyph-shape"
        d={pathD}
        fill={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
      />
    </svg>
  );
}
