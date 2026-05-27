'use client';

import type { ReactElement } from 'react';
import { useMemo, useSyncExternalStore } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';
import {
  WORMHOLE_TUNNEL_QUALITY_PRESETS,
  applyWormholeTunnelQualityPresetToStore,
  detectWormholeDeviceProfile,
  patchWormholeTunnelQualityCustom,
  rebuildWormholeTunnelFromQualitySettings,
  resolveWormholeTunnelQuality,
  syncCustomQualityFromAuto,
  type WormholeTunnelQualityPresetId,
  type ResolvedWormholeTunnelQuality,
} from '@/tunnel/wormholeTunnelQuality';

function useTunnelSnap() {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState(),
    () => tunnelStore.getState(),
  );
}

function preview(
  state: ReturnType<typeof tunnelStore.getState>,
  preset: WormholeTunnelQualityPresetId,
): ResolvedWormholeTunnelQuality {
  return resolveWormholeTunnelQuality({ ...state, wormholeTunnelQualityPreset: preset });
}

type Row = { label: string; values: string[] };

function buildRows(
  effective: ResolvedWormholeTunnelQuality,
  auto: ResolvedWormholeTunnelQuality,
  max: ResolvedWormholeTunnelQuality,
  mobile: ResolvedWormholeTunnelQuality,
  fold: ResolvedWormholeTunnelQuality,
): Row[] {
  const fmt = (n: number) => String(n);
  return [
    {
      label: 'Ring segs (inv / classic)',
      values: [
        `${effective.ringSegsInversion} / ${effective.ringSegsClassic}`,
        `${auto.ringSegsInversion} / ${auto.ringSegsClassic}`,
        `${max.ringSegsInversion} / ${max.ringSegsClassic}`,
        `${mobile.ringSegsInversion} / ${mobile.ringSegsClassic}`,
        `${fold.ringSegsInversion} / ${fold.ringSegsClassic}`,
      ],
    },
    {
      label: 'Stars',
      values: [fmt(effective.starCount), fmt(auto.starCount), fmt(max.starCount), fmt(mobile.starCount), fmt(fold.starCount)],
    },
    {
      label: 'Sky segments (W×H)',
      values: [
        `${effective.skySegW}×${effective.skySegH}`,
        `${auto.skySegW}×${auto.skySegH}`,
        `${max.skySegW}×${max.skySegH}`,
        `${mobile.skySegW}×${mobile.skySegH}`,
        `${fold.skySegW}×${fold.skySegH}`,
      ],
    },
    {
      label: 'Drift motes (cap / live)',
      values: [
        `${effective.particleCap} / ${effective.particleCount}`,
        `${auto.particleCap} / ${auto.particleCount}`,
        `${max.particleCap} / ${max.particleCount}`,
        `${mobile.particleCap} / ${mobile.particleCount}`,
        `${fold.particleCap} / ${fold.particleCount}`,
      ],
    },
    {
      label: 'Mote sprite',
      values: [
        fmt(effective.moteSpriteSize),
        fmt(auto.moteSpriteSize),
        fmt(max.moteSpriteSize),
        fmt(mobile.moteSpriteSize),
        fmt(fold.moteSpriteSize),
      ],
    },
    {
      label: 'Renderer DPR / AA',
      values: [
        `${effective.rendererDpr.toFixed(2)} / ${effective.rendererAntialias ? 'on' : 'off'}`,
        `${auto.rendererDpr.toFixed(2)} / ${auto.rendererAntialias ? 'on' : 'off'}`,
        `${max.rendererDpr.toFixed(2)} / ${max.rendererAntialias ? 'on' : 'off'}`,
        `${mobile.rendererDpr.toFixed(2)} / ${mobile.rendererAntialias ? 'on' : 'off'}`,
        `${fold.rendererDpr.toFixed(2)} / ${fold.rendererAntialias ? 'on' : 'off'}`,
      ],
    },
  ];
}

const PRESET_OPTIONS: Array<{ id: WormholeTunnelQualityPresetId; label: string }> = [
  { id: 'auto', label: 'Auto (device profile)' },
  { id: 'max', label: WORMHOLE_TUNNEL_QUALITY_PRESETS.max.label },
  { id: 'mobile', label: WORMHOLE_TUNNEL_QUALITY_PRESETS.mobile.label },
  { id: 'mobile-narrow', label: WORMHOLE_TUNNEL_QUALITY_PRESETS['mobile-narrow'].label },
  { id: 'fold-inner', label: WORMHOLE_TUNNEL_QUALITY_PRESETS['fold-inner'].label },
  { id: 'low', label: WORMHOLE_TUNNEL_QUALITY_PRESETS.low.label },
  { id: 'custom', label: 'Custom (sliders below)' },
];

/** Tunnel debug — ring stack + ambience quality (helix geometry untouched). */
export function TunnelQualityDebugSection(): ReactElement {
  const s = useTunnelSnap();
  const device = detectWormholeDeviceProfile();

  const effective = useMemo(() => resolveWormholeTunnelQuality(s), [s]);
  const auto = useMemo(() => preview(s, 'auto'), [s]);
  const max = useMemo(() => preview(s, 'max'), [s]);
  const mobile = useMemo(() => preview(s, 'mobile'), [s]);
  const fold = useMemo(() => preview(s, 'fold-inner'), [s]);
  const rows = useMemo(() => buildRows(effective, auto, max, mobile, fold), [effective, auto, max, mobile, fold]);

  const isCustom = s.wormholeTunnelQualityPreset === 'custom';
  const disabled = !s.wormhole3dBackgroundEnabled;

  const onPresetChange = (id: WormholeTunnelQualityPresetId) => {
    if (id === 'auto') {
      const rev = tunnelStore.getState().wormholeTunnelQualityRevision;
      tunnelStore.setState({ wormholeTunnelQualityPreset: 'auto', wormholeTunnelQualityRevision: rev + 1 });
      return;
    }
    if (id === 'custom') {
      syncCustomQualityFromAuto();
      return;
    }
    applyWormholeTunnelQualityPresetToStore(id);
  };

  const setCustomLive = (patch: Partial<typeof s>) => {
    patchWormholeTunnelQualityCustom(patch, { rebuild: false });
  };

  const commitCustomRebuild = () => {
    rebuildWormholeTunnelFromQualitySettings();
  };

  return (
    <div
      className={`mb-3 rounded border border-teal-500/30 bg-zinc-950/50 p-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-200/90">
        Tunnel rings + ambience{' '}
        <span className="font-normal text-zinc-500">(helix untouched)</span>
      </p>
      <p className="mb-2 text-[9px] leading-snug text-zinc-500">
        Ring cylinder segments, starfield, sky dome, drift motes. Julia helix tubes use separate debug
        controls.
      </p>

      <label className="mb-2 flex cursor-pointer items-start gap-2 rounded border border-zinc-800/80 bg-black/25 px-2 py-1.5">
        <input
          type="checkbox"
          checked={s.wormholeDebugDriftMotesIdleBuzz}
          disabled={disabled}
          onChange={(e) => tunnelStore.setState({ wormholeDebugDriftMotesIdleBuzz: e.target.checked })}
          className="mt-0.5 rounded border-zinc-600 disabled:opacity-40"
        />
        <span className="text-[9px] leading-snug text-zinc-400">
          <span className="font-medium text-zinc-300">Idle drift-mote buzz</span> — keep XY wave/shimmer
          on tube motes when scroll is fully still (default off for wormhole5 locked mouth).
        </span>
      </label>

      <div className="mb-2 rounded border border-zinc-800/80 bg-black/30 px-2 py-1.5 text-[9px] leading-snug text-zinc-400">
        <span className="font-semibold text-zinc-300">Device:</span> {device.label}
        <br />
        <span className="text-zinc-500">
          touch {device.coarseTouch ? 'yes' : 'no'} · iOS {device.iosLike ? 'yes' : 'no'} · narrow{' '}
          {device.narrowViewport ? 'yes' : 'no'} · fold inner {device.foldInnerPortrait ? 'yes' : 'no'} ·
          auto tier → <span className="text-teal-300/90">{device.suggestedPreset}</span>
        </span>
      </div>

      <p className="mb-1 text-[9px] text-zinc-500">
        Active preset: <span className="text-teal-200/90">{effective.presetId}</span>
        {effective.presetId === 'auto' ? (
          <>
            {' '}
            → <span className="text-zinc-300">{effective.label}</span>
          </>
        ) : null}
        {' · '}
        revision {s.wormholeTunnelQualityRevision}
        {' · '}
        rings {effective.ringCount} @ spacing {effective.ringSpacing}
      </p>

      <div className="mb-2 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-[9px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-0.5 pr-2 font-normal">Metric</th>
              <th className="py-0.5 pr-2 font-semibold text-teal-200/80">Live</th>
              <th className="py-0.5 pr-2 font-normal">Auto</th>
              <th className="py-0.5 pr-2 font-normal">Max</th>
              <th className="py-0.5 pr-2 font-normal">Mobile</th>
              <th className="py-0.5 font-normal">Fold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-zinc-800/60 text-zinc-300">
                <td className="py-0.5 pr-2 text-zinc-500">{row.label}</td>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={`py-0.5 pr-2 tabular-nums ${i === 0 ? 'text-teal-100/90' : 'text-zinc-400'}`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="mb-2 block">
        <span className="mb-1 block text-[10px] text-zinc-400">Quality preset</span>
        <select
          disabled={disabled}
          value={s.wormholeTunnelQualityPreset}
          onChange={(e) => onPresetChange(e.target.value as WormholeTunnelQualityPresetId)}
          className="w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-teal-500/60 disabled:cursor-not-allowed"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {isCustom ? (
        <div className="mb-2 space-y-2 border-t border-zinc-800/60 pt-2">
          <p className="text-[9px] text-zinc-500">
            Custom overrides — release a slider or use Rebuild to apply (rings / stars / sky / motes
            are recreated in Three.js).
          </p>
          {(
            [
              ['Ring segs (inversion)', 'wormholeTunnelRingSegsInversion', 48, 320, 8],
              ['Ring segs (classic)', 'wormholeTunnelRingSegsClassic', 40, 256, 8],
              ['Star count', 'wormholeTunnelStarCount', 400, 3000, 100],
              ['Sky seg W', 'wormholeTunnelSkySegW', 24, 80, 4],
              ['Sky seg H', 'wormholeTunnelSkySegH', 16, 48, 4],
              ['Particle cap', 'wormholeTunnelParticleCap', 600, 5000, 100],
            ] as const
          ).map(([label, key, min, max, step]) => (
            <label key={key} className="block text-[10px]">
              <span className="mb-0.5 flex justify-between text-zinc-400">
                <span>{label}</span>
                <span className="tabular-nums text-zinc-300">{s[key]}</span>
              </span>
              <input
                type="range"
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                value={s[key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const patch =
                    key === 'wormholeTunnelParticleCap'
                      ? { [key]: v, particleCount: v }
                      : { [key]: v };
                  setCustomLive(patch);
                }}
                onPointerUp={commitCustomRebuild}
                onKeyUp={commitCustomRebuild}
                className="w-full"
              />
            </label>
          ))}
          <label className="block text-[10px]">
            <span className="mb-1 block text-zinc-400">Mote sprite texture</span>
            <select
              disabled={disabled}
              value={s.wormholeTunnelMoteSpriteSize}
              onChange={(e) =>
                patchWormholeTunnelQualityCustom({
                  wormholeTunnelMoteSpriteSize: Number(e.target.value) as 64 | 128,
                })
              }
              className="w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1 text-[11px]"
            >
              <option value={64}>64 (mobile)</option>
              <option value={128}>128 (desktop max)</option>
            </select>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => rebuildWormholeTunnelFromQualitySettings()}
          className="flex-1 rounded border border-teal-600/50 bg-teal-950/40 px-2 py-1 text-[10px] text-teal-100/90 hover:bg-teal-900/50 disabled:opacity-40"
        >
          Rebuild tunnel scene
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => syncCustomQualityFromAuto()}
          className="rounded border border-dashed border-zinc-600 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
        >
          Auto → custom
        </button>
      </div>
    </div>
  );
}
