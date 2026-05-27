'use client';

import type { ReactElement } from 'react';
import { useMemo, useSyncExternalStore } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';
import {
  WORMHOLE_HELIX_QUALITY_PRESETS,
  applyWormholeHelixQualityPresetToStore,
  patchWormholeHelixQualityCustom,
  rebuildWormholeHelixFromQualitySettings,
  resolveWormholeHelixQuality,
  syncCustomHelixQualityFromAuto,
  type WormholeHelixQualityPresetId,
  type ResolvedWormholeHelixQuality,
} from '@/tunnel/wormholeHelixQuality';
import { detectWormholeDeviceProfile } from '@/tunnel/wormholeTunnelQuality';

function useTunnelSnap() {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState(),
    () => tunnelStore.getState(),
  );
}

function preview(
  state: ReturnType<typeof tunnelStore.getState>,
  preset: WormholeHelixQualityPresetId,
): ResolvedWormholeHelixQuality {
  return resolveWormholeHelixQuality({ ...state, wormholeHelixQualityPreset: preset });
}

type Row = { label: string; values: string[] };

function buildRows(
  effective: ResolvedWormholeHelixQuality,
  auto: ResolvedWormholeHelixQuality,
  max: ResolvedWormholeHelixQuality,
  lab: ResolvedWormholeHelixQuality,
  mobile: ResolvedWormholeHelixQuality,
  fold: ResolvedWormholeHelixQuality,
): Row[] {
  const fmt = (n: number) => String(n);
  const shape = (q: ResolvedWormholeHelixQuality) =>
    `r${q.tubeRadius.toFixed(2)} · twist ${q.twistTurns.toFixed(1)} · scale ${q.radialScale.toFixed(2)}`;
  return [
    {
      label: 'Path pts / tube segs',
      values: [
        `${effective.pathPts} / ${effective.tubeRadialSegs}`,
        `${auto.pathPts} / ${auto.tubeRadialSegs}`,
        `${max.pathPts} / ${max.tubeRadialSegs}`,
        `${lab.pathPts} / ${lab.tubeRadialSegs}`,
        `${mobile.pathPts} / ${mobile.tubeRadialSegs}`,
        `${fold.pathPts} / ${fold.tubeRadialSegs}`,
      ],
    },
    {
      label: 'Lab ribbon shape',
      values: [shape(effective), shape(auto), shape(max), shape(lab), shape(mobile), shape(fold)],
    },
    {
      label: 'Opacity / mobile bloom',
      values: [
        `${effective.opacity.toFixed(2)} / ${effective.effectiveMobileBloomMul.toFixed(2)}×`,
        `${auto.opacity.toFixed(2)} / ${auto.mobileBloomMul.toFixed(2)}×`,
        `${max.opacity.toFixed(2)} / ${max.mobileBloomMul.toFixed(2)}×`,
        `${lab.opacity.toFixed(2)} / ${lab.mobileBloomMul.toFixed(2)}×`,
        `${mobile.opacity.toFixed(2)} / ${mobile.mobileBloomMul.toFixed(2)}×`,
        `${fold.opacity.toFixed(2)} / ${fold.mobileBloomMul.toFixed(2)}×`,
      ],
    },
    {
      label: 'Wobble amp / freq',
      values: [
        `${effective.wobbleAmp.toFixed(2)} / ${fmt(effective.wobbleFreq)}`,
        `${auto.wobbleAmp.toFixed(2)} / ${fmt(auto.wobbleFreq)}`,
        `${max.wobbleAmp.toFixed(2)} / ${fmt(max.wobbleFreq)}`,
        `${lab.wobbleAmp.toFixed(2)} / ${fmt(lab.wobbleFreq)}`,
        `${mobile.wobbleAmp.toFixed(2)} / ${fmt(mobile.wobbleFreq)}`,
        `${fold.wobbleAmp.toFixed(2)} / ${fmt(fold.wobbleFreq)}`,
      ],
    },
  ];
}

const PRESET_OPTIONS: Array<{ id: WormholeHelixQualityPresetId; label: string }> = [
  { id: 'auto', label: 'Auto (device profile)' },
  { id: 'max', label: WORMHOLE_HELIX_QUALITY_PRESETS.max.label },
  { id: 'lab', label: WORMHOLE_HELIX_QUALITY_PRESETS.lab.label },
  { id: 'mobile', label: WORMHOLE_HELIX_QUALITY_PRESETS.mobile.label },
  { id: 'mobile-narrow', label: WORMHOLE_HELIX_QUALITY_PRESETS['mobile-narrow'].label },
  { id: 'fold-inner', label: WORMHOLE_HELIX_QUALITY_PRESETS['fold-inner'].label },
  { id: 'low', label: WORMHOLE_HELIX_QUALITY_PRESETS.low.label },
  { id: 'custom', label: 'Custom (sliders below)' },
];

/** Tunnel debug — helix tube geometry quality (ring stack + Julia shader variant separate). */
export function HelixQualityDebugSection(): ReactElement {
  const s = useTunnelSnap();
  const device = detectWormholeDeviceProfile();

  const effective = useMemo(() => resolveWormholeHelixQuality(s), [s]);
  const auto = useMemo(() => preview(s, 'auto'), [s]);
  const max = useMemo(() => preview(s, 'max'), [s]);
  const lab = useMemo(() => preview(s, 'lab'), [s]);
  const mobile = useMemo(() => preview(s, 'mobile'), [s]);
  const fold = useMemo(() => preview(s, 'fold-inner'), [s]);
  const rows = useMemo(() => buildRows(effective, auto, max, lab, mobile, fold), [effective, auto, max, lab, mobile, fold]);

  const isCustom = s.wormholeHelixQualityPreset === 'custom';
  const disabled = !s.wormhole3dBackgroundEnabled || !s.wormholeHelices3dEnabled;

  const onPresetChange = (id: WormholeHelixQualityPresetId) => {
    if (id === 'auto') {
      tunnelStore.setState({ wormholeHelixQualityPreset: 'auto' });
      rebuildWormholeHelixFromQualitySettings();
      return;
    }
    if (id === 'custom') {
      syncCustomHelixQualityFromAuto();
      return;
    }
    applyWormholeHelixQualityPresetToStore(id);
  };

  const setCustomLive = (patch: Parameters<typeof patchWormholeHelixQualityCustom>[0]) => {
    patchWormholeHelixQualityCustom(patch, { rebuild: false });
  };

  const commitCustomRebuild = () => {
    rebuildWormholeHelixFromQualitySettings();
  };

  return (
    <div
      className={`mb-3 rounded border border-violet-500/30 bg-zinc-950/50 p-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-200/90">
        Wormhole helix geometry{' '}
        <span className="font-normal text-zinc-500">(tubes only — rings separate)</span>
      </p>
      <p className="mb-2 text-[9px] leading-snug text-zinc-500">
        Catmull-Rom path density, tube radial segments, and lab ribbon shape. Julia shader variant /
        pattern / bloom sliders are below in the helix shader section.
      </p>

      <div className="mb-2 rounded border border-zinc-800/80 bg-black/30 px-2 py-1.5 text-[9px] leading-snug text-zinc-400">
        <span className="font-semibold text-zinc-300">Device:</span> {device.label}
        <br />
        <span className="text-zinc-500">
          touch {device.coarseTouch ? 'yes' : 'no'} · iOS {device.iosLike ? 'yes' : 'no'} · narrow{' '}
          {device.narrowViewport ? 'yes' : 'no'} · fold inner {device.foldInnerPortrait ? 'yes' : 'no'} ·
          auto tier → <span className="text-violet-300/90">{auto.label}</span>
        </span>
      </div>

      <p className="mb-1 text-[9px] text-zinc-500">
        Active preset: <span className="text-violet-200/90">{effective.presetId}</span>
        {effective.presetId === 'auto' ? (
          <>
            {' '}
            → <span className="text-zinc-300">{effective.label}</span>
          </>
        ) : null}
        {' · '}
        revision {s.wormholeHelixQualityRevision}
        {' · '}
        strands {s.helixCount} (lab routes use 3)
      </p>

      <div className="mb-2 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-[9px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-0.5 pr-2 font-normal">Metric</th>
              <th className="py-0.5 pr-2 font-semibold text-violet-200/80">Live</th>
              <th className="py-0.5 pr-2 font-normal">Auto</th>
              <th className="py-0.5 pr-2 font-normal">Max</th>
              <th className="py-0.5 pr-2 font-normal">Lab</th>
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
                    className={`py-0.5 pr-2 tabular-nums ${i === 0 ? 'text-violet-100/90' : 'text-zinc-400'}`}
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
          value={s.wormholeHelixQualityPreset}
          onChange={(e) => onPresetChange(e.target.value as WormholeHelixQualityPresetId)}
          className="w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-violet-500/60 disabled:cursor-not-allowed"
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
            Custom overrides — release a slider or use Rebuild to recreate helix tube geometry in
            Three.js.
          </p>
          {(
            [
              ['Path points (per strand)', 'wormholeHelixPathPts', 300, 1600, 50],
              ['Tube radial segments', 'wormholeHelixTubeRadialSegs', 3, 32, 1],
              ['Tube radius', 'wormholeHelixTubeRadius', 0.04, 0.35, 0.01],
              ['Twist turns', 'wormholeHelixTwistTurns', 1, 8, 0.1],
              ['Radial scale', 'wormholeHelixRadialScale', 0.5, 1.2, 0.02],
              ['Wobble amplitude', 'wormholeHelixWobbleAmp', 0.2, 0.9, 0.02],
              ['Wobble frequency', 'wormholeHelixWobbleFreq', 4, 24, 0.5],
              ['Opacity', 'wormholeHelixOpacity', 0.4, 1, 0.02],
              ['Mobile bloom mul (narrow)', 'wormholeHelixMobileBloomMul', 0.5, 1, 0.05],
            ] as const
          ).map(([label, key, min, max, step]) => (
            <label key={key} className="block text-[10px]">
              <span className="mb-0.5 flex justify-between text-zinc-400">
                <span>{label}</span>
                <span className="tabular-nums text-zinc-300">
                  {key === 'wormholeHelixPathPts' || key === 'wormholeHelixTubeRadialSegs'
                    ? s[key]
                    : s[key].toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                value={s[key]}
                onChange={(e) => setCustomLive({ [key]: Number(e.target.value) })}
                onPointerUp={commitCustomRebuild}
                onKeyUp={commitCustomRebuild}
                className="w-full"
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => rebuildWormholeHelixFromQualitySettings()}
          className="flex-1 rounded border border-violet-600/50 bg-violet-950/40 px-2 py-1 text-[10px] text-violet-100/90 hover:bg-violet-900/50 disabled:opacity-40"
        >
          Rebuild helix scene
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => syncCustomHelixQualityFromAuto()}
          className="rounded border border-dashed border-zinc-600 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
        >
          Auto → custom
        </button>
      </div>
    </div>
  );
}
