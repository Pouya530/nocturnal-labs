'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  getWormholeAmbientEqualizerBands,
  isWormholeAmbientEqualizerAttached,
  subscribeWormholeAmbientEqualizer,
} from '@/audio/wormholeAmbientEqualizer';

type JuliaAmbientEqualizerMonitorProps = {
  enabled: boolean;
  strength: number;
  active?: boolean;
};

function Bar({ label, value, color }: { label: string; value: number; color: string }): ReactElement {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-1.5">
      <span className="text-zinc-500">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: 'width 60ms linear' }}
        />
      </div>
      <span className="text-right text-zinc-400">{pct}%</span>
    </div>
  );
}

export function JuliaAmbientEqualizerMonitor({
  enabled,
  strength,
  active = true,
}: JuliaAmbientEqualizerMonitorProps): ReactElement {
  const [, tick] = useState(0);
  const attached = useSyncExternalStore(
    subscribeWormholeAmbientEqualizer,
    isWormholeAmbientEqualizerAttached,
    () => false,
  );

  useEffect(() => {
    if (!active || !enabled) return;
    let raf = 0;
    const loop = () => {
      tick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, enabled]);

  const bands = getWormholeAmbientEqualizerBands();

  return (
    <div className="mb-2 rounded border border-fuchsia-900/50 bg-fuchsia-950/15 px-2 py-2 font-mono text-[10px] text-zinc-300">
      <p className="mb-1.5 font-sans font-semibold uppercase tracking-[0.12em] text-fuchsia-200/90">
        Julia FFT equalizer
      </p>
      <p className="mb-2 font-sans text-[9px] leading-snug text-zinc-500">
        Strength {strength.toFixed(2)} — drives uTime nudge, uIntensity, helix shimmer (Web Audio).
        {!enabled ? ' Toggle on to sample.' : !attached ? ' Awaiting analyser…' : ''}
      </p>
      {enabled ? (
        <div className="space-y-1">
          <Bar label="Bass" value={bands.bass} color="bg-fuchsia-400/90" />
          <Bar label="Mid" value={bands.mid} color="bg-violet-400/85" />
          <Bar label="Hi" value={bands.treble} color="bg-cyan-400/80" />
          <Bar label="RMS" value={bands.rms} color="bg-emerald-400/75" />
        </div>
      ) : null}
    </div>
  );
}
