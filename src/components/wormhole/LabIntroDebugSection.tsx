'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { getActiveIntro, initActiveIntro, setActiveIntro, type IntroName } from '@/intros/introRegistry';

const INTRO_OPTIONS: Array<{ value: IntroName; label: string; description: string }> = [
  { value: 'stage-reveal', label: 'Stage reveal', description: 'Fade + scale, gated opacity (default)' },
  { value: 'prism-breach', label: 'Prism breach', description: 'RGB ghosts converge, scanline sweep' },
  { value: 'ghost-echo', label: 'Ghost echo', description: 'Five offset copies collapse into one' },
  { value: 'gravity-well', label: 'Gravity well', description: 'Expands from a bright point with bloom' },
];

/** Tunnel debug — intro sequence picker for `/wormhole5` (THREE_INTRO_SEQUENCES.md). */
export function LabIntroDebugSection(): ReactElement {
  const [active, setActive] = useState<IntroName>('stage-reveal');

  useEffect(() => {
    setActive(getActiveIntro());
  }, []);

  const replay = useCallback(() => {
    initActiveIntro();
    window.dispatchEvent(new CustomEvent('nl-replay-lab-intro'));
  }, []);

  const handleSelect = useCallback((name: IntroName) => {
    setActiveIntro(name);
    setActive(name);
    initActiveIntro();
    window.dispatchEvent(new CustomEvent('nl-replay-lab-intro'));
  }, []);

  return (
    <div className="mb-3 rounded border border-violet-500/25 bg-zinc-950/50 p-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-200/90">
        Intro sequence <span className="font-normal text-zinc-500">(/wormhole5)</span>
      </p>
      <div className="mb-2 grid grid-cols-1 gap-1.5">
        {INTRO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={[
              'rounded border px-2 py-1.5 text-left transition-colors',
              active === opt.value
                ? 'border-violet-500/60 bg-violet-950/40 text-white'
                : 'border-zinc-700/80 bg-black/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900/60',
            ].join(' ')}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.06em]">{opt.label}</span>
            <span className="mt-0.5 block text-[9px] leading-snug text-zinc-500">{opt.description}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={replay}
        className="w-full rounded border border-dashed border-zinc-600 py-1 text-[10px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
      >
        Replay current intro
      </button>
    </div>
  );
}
