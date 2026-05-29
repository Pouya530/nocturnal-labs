'use client';

import type { ReactElement } from 'react';
import { useEffect, useSyncExternalStore } from 'react';

import {
  clampPct,
  heroCoinDebugViewportKind,
  heroCoinEffectiveDiameterPx,
  heroCoinPxFromBaselinePct,
  HERO_COIN_BASELINE_DESKTOP_PX,
  HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
  HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
  HERO_COIN_MOBILE_PORTRAIT_SCALE,
  persistHeroCoinDebugSize,
  readStoredHeroCoinDebugSize,
} from '@/lib/heroCoinDebugSize';
import {
  subscribeHeroFocalCssVars,
  warmHeroCoinDebugSizeOnClientMount,
} from '@/lib/wormholeHeroFocalPoint';
import { rebuildWormholeCoinScrollCamera } from '@/lib/wormholeCoinScrollCamera';
import { tunnelStore } from '@/tunnel/tunnelStore';

function useTunnelSnap() {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState(),
    () => tunnelStore.getState(),
  );
}

function pctPresetButton(
  label: string,
  active: boolean,
  onClick: () => void,
): ReactElement {
  return (
    <button
      type="button"
      className={[
        'rounded border px-1.5 py-0.5 text-[10px] tabular-nums',
        active
          ? 'border-teal-500/60 bg-teal-950/50 text-teal-100'
          : 'border-zinc-600 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
      ].join(' ')}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export type HeroCoinSizeDebugSectionProps = {
  localhost: boolean;
};

/** Tunnel debug — coin size % vs 292px desktop / 280px mobile portrait baselines. */
export function HeroCoinSizeDebugSection({ localhost }: HeroCoinSizeDebugSectionProps): ReactElement {
  const s = useTunnelSnap();
  const viewportKind = useSyncExternalStore(
    subscribeHeroFocalCssVars,
    () => heroCoinDebugViewportKind(),
    () => 'other' as const,
  );

  useEffect(() => {
    if (!localhost) return;
    const stored = readStoredHeroCoinDebugSize();
    if (Object.keys(stored).length > 0) {
      tunnelStore.setState({ ...stored, wormholeDebugCoinSizeOverride: true });
    }
    warmHeroCoinDebugSizeOnClientMount();
  }, [localhost]);

  const desktopPx = heroCoinPxFromBaselinePct(
    HERO_COIN_BASELINE_DESKTOP_PX,
    s.wormholeDebugCoinSizeDesktopPct,
  );
  const mobileBasePx = heroCoinPxFromBaselinePct(
    HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX,
    s.wormholeDebugCoinSizeMobilePct,
  );
  const mobileEffectivePx = heroCoinEffectiveDiameterPx(
    mobileBasePx,
    HERO_COIN_MOBILE_PORTRAIT_SCALE,
  );

  const patchCoinSize = (partial: Partial<typeof s>) => {
    tunnelStore.setState(partial);
    warmHeroCoinDebugSizeOnClientMount();
    if (localhost) persistHeroCoinDebugSize();
  };

  const rebuildCoin = () => {
    warmHeroCoinDebugSizeOnClientMount();
    rebuildWormholeCoinScrollCamera();
    window.dispatchEvent(new Event('resize'));
  };

  const activePx =
    s.wormholeDebugCoinSizeOverride && viewportKind === 'desktop'
      ? desktopPx
      : s.wormholeDebugCoinSizeOverride && viewportKind === 'mobilePortrait'
        ? mobileBasePx
        : null;

  const activeEffectivePx =
    s.wormholeDebugCoinSizeOverride && viewportKind === 'mobilePortrait'
      ? mobileEffectivePx
      : activePx;

  return (
    <div className="mb-2 rounded-md border border-teal-800/40 bg-teal-950/20 px-2 py-2">
      <p className="mb-1 text-[10px] font-semibold leading-snug text-teal-100/95">
        Coin size preview{' '}
        <span className="font-normal text-zinc-500">(% of original baselines)</span>
      </p>
      <p className="mb-2 text-[10px] leading-snug text-zinc-500">
        Desktop baseline {HERO_COIN_BASELINE_DESKTOP_PX}px · mobile portrait {HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX}
        px × {HERO_COIN_MOBILE_PORTRAIT_SCALE} scale. Shipped CSS: {HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP}% (
        {heroCoinPxFromBaselinePct(HERO_COIN_BASELINE_DESKTOP_PX, HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP)}px) ·{' '}
        {HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE}% (
        {heroCoinPxFromBaselinePct(HERO_COIN_BASELINE_MOBILE_PORTRAIT_PX, HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE)}
        px base). Toggle override to preview other % live.
      </p>
      <label className="mb-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={s.wormholeDebugCoinSizeOverride}
          onChange={(e) => patchCoinSize({ wormholeDebugCoinSizeOverride: e.target.checked })}
          className="rounded border-zinc-600"
        />
        <span className="leading-snug">Override coin size (live CSS var)</span>
      </label>

      <div className={!s.wormholeDebugCoinSizeOverride ? 'pointer-events-none opacity-45' : ''}>
        <p className="mb-1 text-[10px] font-medium text-zinc-300">Desktop ≥1024px</p>
        <div className="mb-1 flex flex-wrap gap-1">
          {[90, 100, 110, 120].map((pct) =>
            pctPresetButton(
              `${pct}%`,
              s.wormholeDebugCoinSizeDesktopPct === pct,
              () => patchCoinSize({ wormholeDebugCoinSizeDesktopPct: pct }),
            ),
          )}
        </div>
        <label className="mb-2 block">
          <span className="mb-0.5 flex justify-between text-[10px] text-zinc-400">
            <span>{s.wormholeDebugCoinSizeDesktopPct}%</span>
            <span className="tabular-nums text-zinc-300">{desktopPx}px</span>
          </span>
          <input
            type="range"
            min={50}
            max={200}
            step={1}
            disabled={!s.wormholeDebugCoinSizeOverride}
            value={s.wormholeDebugCoinSizeDesktopPct}
            onChange={(e) =>
              patchCoinSize({ wormholeDebugCoinSizeDesktopPct: clampPct(Number(e.target.value)) })
            }
            className="w-full disabled:cursor-not-allowed"
          />
        </label>

        <p className="mb-1 text-[10px] font-medium text-zinc-300">Mobile portrait</p>
        <div className="mb-1 flex flex-wrap gap-1">
          {[51, 80, 90, 100].map((pct) =>
            pctPresetButton(
              `${pct}%`,
              s.wormholeDebugCoinSizeMobilePct === pct,
              () => patchCoinSize({ wormholeDebugCoinSizeMobilePct: pct }),
            ),
          )}
        </div>
        <label className="mb-2 block">
          <span className="mb-0.5 flex justify-between text-[10px] text-zinc-400">
            <span>{s.wormholeDebugCoinSizeMobilePct}%</span>
            <span className="tabular-nums text-zinc-300">
              {mobileBasePx}px → ~{mobileEffectivePx}px rendered
            </span>
          </span>
          <input
            type="range"
            min={50}
            max={200}
            step={1}
            disabled={!s.wormholeDebugCoinSizeOverride}
            value={s.wormholeDebugCoinSizeMobilePct}
            onChange={(e) =>
              patchCoinSize({ wormholeDebugCoinSizeMobilePct: clampPct(Number(e.target.value)) })
            }
            className="w-full disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <p className="mb-2 text-[9px] tabular-nums leading-snug text-zinc-500">
        Viewport: {viewportKind}
        {activePx != null ? (
          <>
            {' '}
            · active base {activePx}px
            {viewportKind === 'mobilePortrait' ? ` (~${activeEffectivePx}px stage)` : null}
            {' '}
            · rev {s.wormholeDebugCoinSizeRevision}
          </>
        ) : s.wormholeDebugCoinSizeOverride ? (
          ' · override on (fold/landscape uses shipped CSS — use DevTools device + touch)'
        ) : (
          ' · shipped CSS'
        )}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="flex-1 rounded border border-teal-600/50 bg-teal-950/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-teal-100/90 hover:bg-teal-900/50 disabled:opacity-40"
          disabled={!s.wormholeDebugCoinSizeOverride}
          onClick={rebuildCoin}
        >
          Rebuild coin layout
        </button>
        <button
          type="button"
          className="rounded border border-dashed border-zinc-600 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          onClick={() =>
            patchCoinSize({
              wormholeDebugCoinSizeDesktopPct: HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_DESKTOP,
              wormholeDebugCoinSizeMobilePct: HERO_COIN_DEBUG_SIZE_PCT_DEFAULT_MOBILE,
            })
          }
        >
          Ship targets
        </button>
        <button
          type="button"
          className="rounded border border-dashed border-zinc-600 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          onClick={() =>
            patchCoinSize({
              wormholeDebugCoinSizeDesktopPct: 100,
              wormholeDebugCoinSizeMobilePct: 100,
            })
          }
        >
          100%
        </button>
      </div>
    </div>
  );
}
