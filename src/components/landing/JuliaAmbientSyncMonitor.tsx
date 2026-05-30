'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  isWormhole5AmbientGestureUnlocked,
  isWormhole5AmbientPlaying,
  subscribeWormhole5AmbientAudio,
} from '@/audio/wormhole5AmbientAudio';
import {
  resolveWormholeJuliaAmbientSyncTimes,
  wormholeJuliaHelixRadPerSec,
} from '@/lib/wormholeJuliaAmbientSyncTimes';

type JuliaAmbientSyncMonitorProps = {
  syncEnabled: boolean;
  patternSyncRate: number;
  helixSpinRate: number;
  helixSpinAudioSync: boolean;
  syncShaders: boolean;
  syncHelixSpin: boolean;
  syncStars: boolean;
  /** When false, pause rAF polling (panel hidden). */
  active?: boolean;
};

function formatSec(t: number | null): string {
  if (t == null) return '—';
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, '0')}` : `${s.toFixed(2)}s`;
}

function formatRadPerSec(r: number | null): string {
  if (r == null) return '—';
  return `${r.toFixed(3)} rad/s`;
}

/**
 * Live readout for tunnel debug — mirrors {@link JuliaWormholeBackdrop} sync clocks.
 */
export function JuliaAmbientSyncMonitor({
  syncEnabled,
  patternSyncRate,
  helixSpinRate,
  helixSpinAudioSync,
  syncShaders,
  syncHelixSpin,
  syncStars,
  active = true,
}: JuliaAmbientSyncMonitorProps): ReactElement {
  const [clockElapsed, setClockElapsed] = useState(0);
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
    let last = performance.now();
    let elapsed = 0;
    const loop = (now: number) => {
      elapsed += Math.min((now - last) / 1000, 0.05);
      last = now;
      setClockElapsed(elapsed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((now) => {
      last = now;
      loop(now);
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const times = resolveWormholeJuliaAmbientSyncTimes({
    syncEnabled,
    patternSyncRate,
    helixSpinRate,
    helixSpinAudioSync,
    syncShaders,
    syncHelixSpin,
    syncStars,
    clockElapsed,
    warmAudio: syncEnabled,
  });

  const helixRad = wormholeJuliaHelixRadPerSec({
    helixSpinFromAudio: times.helixSpinFromAudio,
    helixSpinRate,
    patternSyncRate,
  });

  const status = !unlocked
    ? 'Awaiting preloader ENTER'
    : times.audioSec == null
      ? 'No audio element'
      : playing
        ? 'Playing'
        : 'Paused (audio clocks frozen)';

  return (
    <div
      className="mb-2 rounded border border-zinc-700/80 bg-black/40 px-2 py-2 font-mono text-[10px] leading-relaxed text-zinc-300"
      aria-live="polite"
    >
      <p className="mb-1.5 font-sans font-semibold uppercase tracking-[0.12em] text-violet-200/90">
        Julia ↔ ambient sync
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-zinc-500">Master</dt>
        <dd className={syncEnabled ? 'text-emerald-300/90' : 'text-amber-300/90'}>
          {syncEnabled ? 'ON' : 'OFF'}
        </dd>
        <dt className="text-zinc-500">MP3</dt>
        <dd>{status}</dd>
        <dt className="text-zinc-500">currentTime</dt>
        <dd>{formatSec(times.audioSec)}</dd>
        <dt className="text-zinc-500">elapsed</dt>
        <dd>{formatSec(times.clockElapsed)}</dd>
        <dt className="text-zinc-500">patternTime</dt>
        <dd className="text-violet-200/95">
          {formatSec(times.patternTime)}
          <span className="text-zinc-600">
            {' '}
            ({times.patternFromAudio ? 'MP3' : 'clock'})
          </span>
        </dd>
        <dt className="text-zinc-500">helixSpinTime</dt>
        <dd>
          {formatSec(times.helixSpinTime)}
          <span className="text-zinc-600">
            {' '}
            ({times.helixSpinFromAudio ? 'MP3' : 'clock'})
          </span>
        </dd>
        <dt className="text-zinc-500">starTime</dt>
        <dd>
          {formatSec(times.starTime)}
          <span className="text-zinc-600"> ({times.starsFromAudio ? 'MP3' : 'clock'})</span>
        </dd>
        <dt className="text-zinc-500">helix ω (clock)</dt>
        <dd>{formatRadPerSec(helixRad.wallClock)}</dd>
        <dt className="text-zinc-500">helix ω (audio)</dt>
        <dd className="text-violet-200/90">{formatRadPerSec(helixRad.audio)}</dd>
      </dl>
      {syncEnabled && playing ? (
        <p className="mt-1.5 font-sans text-[9px] leading-snug text-zinc-500">
          Pause AUDIO to confirm audio-synced targets freeze; helix wall-clock spin keeps moving
          unless helix audio sync is on.
        </p>
      ) : null}
    </div>
  );
}
