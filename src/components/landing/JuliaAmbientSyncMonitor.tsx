'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  computeWormhole5JuliaShaderTimes,
  isWormhole5AmbientGestureUnlocked,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
} from '@/audio/wormhole5AmbientAudio';

type JuliaAmbientSyncMonitorProps = {
  syncEnabled: boolean;
  syncRate: number;
  /** When false, pause rAF polling (panel hidden). */
  active?: boolean;
};

function formatSec(t: number | null): string {
  if (t == null) return '—';
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, '0')}` : `${s.toFixed(2)}s`;
}

/**
 * Live readout for tunnel debug — mirrors {@link JuliaWormholeBackdrop} `uTime` wiring.
 */
export function JuliaAmbientSyncMonitor({
  syncEnabled,
  syncRate,
  active = true,
}: JuliaAmbientSyncMonitorProps): ReactElement {
  const [, tick] = useState(0);
  const playing = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    isWormhole5AmbientPlaying,
    () => false,
  );
  const unlocked = useSyncExternalStore(
    subscribeWormhole5AmbientAudio,
    isWormhole5AmbientGestureUnlocked,
    () => false,
  );

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      tick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const times = computeWormhole5JuliaShaderTimes(syncEnabled, syncRate);
  const status = !unlocked
    ? 'Awaiting preloader ENTER'
    : times.audioSec == null
      ? 'No audio element'
      : playing
        ? 'Playing'
        : 'Paused (pattern frozen)';

  return (
    <div
      className="mb-2 rounded border border-zinc-700/80 bg-black/40 px-2 py-2 font-mono text-[10px] leading-relaxed text-zinc-300"
      aria-live="polite"
    >
      <p className="mb-1.5 font-sans font-semibold uppercase tracking-[0.12em] text-violet-200/90">
        Julia ↔ ambient sync
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-zinc-500">Sync</dt>
        <dd className={syncEnabled ? 'text-emerald-300/90' : 'text-amber-300/90'}>
          {syncEnabled ? 'ON → uTime from MP3' : 'OFF → uTime from Three.js clock'}
        </dd>
        <dt className="text-zinc-500">Rate</dt>
        <dd>{syncRate.toFixed(2)}×</dd>
        <dt className="text-zinc-500">MP3</dt>
        <dd>{status}</dd>
        <dt className="text-zinc-500">currentTime</dt>
        <dd>{formatSec(times.audioSec)}</dd>
        <dt className="text-zinc-500">uTime</dt>
        <dd className="text-violet-200/95">
          {times.uTime != null ? formatSec(times.uTime) : '— (clock)'}
        </dd>
        <dt className="text-zinc-500">sky uTime</dt>
        <dd className="text-zinc-400">
          {times.skyUTime != null ? formatSec(times.skyUTime) : '—'}
          <span className="text-zinc-600"> (×0.4)</span>
        </dd>
      </dl>
      {syncEnabled && playing ? (
        <p className="mt-1.5 font-sans text-[9px] leading-snug text-zinc-500">
          Rings + helix use uTime; pause AUDIO to confirm the pattern stops.
        </p>
      ) : null}
    </div>
  );
}
