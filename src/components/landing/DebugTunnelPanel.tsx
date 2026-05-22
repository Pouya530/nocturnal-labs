'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { isLocalhostHostname } from '@/lib/isLocalhost';
import {
  WORMHOLE_ATMOSPHERE_PRESET_IDS,
  WORMHOLE_ATMOSPHERE_PRESET_LABELS,
  type WormholeAtmospherePreset,
} from '@/tunnel/wormholeAtmospherePreset';
import {
  WORMHOLE_HELIX_TUBE_LABELS,
  WORMHOLE_HELIX_TUBE_VARIANTS,
  clampHelixTubeVariant,
  type WormholeHelixTubeVariant,
} from '@/tunnel/wormholeHelixTubePreset';
import {
  WORMHOLE_JOURNEY_MOUSE_PARALLAX_LABELS,
  WORMHOLE_JOURNEY_MOUSE_PARALLAX_MODES,
  type WormholeJourneyMouseParallaxMode,
} from '@/tunnel/wormholeJourneyMouseParallax';
import { tunnelStore } from '@/tunnel/tunnelStore';
import { LabIntroDebugSection } from '@/components/wormhole/LabIntroDebugSection';

function useTunnelSnap() {
  return useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState(),
    () => tunnelStore.getState(),
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type DebugTunnelPanelProps = {
  /** When true (e.g. `/wormhole` route), show bloom/fog sliders. Avoids `usePathname` CSR issues in dev. */
  showWormholeControls?: boolean;
  /** When true and path is `/wormhole5`, show THREE_INTRO_SEQUENCES intro picker. */
  showIntroSequence?: boolean;
};

/** Native debug controls (Leva substitute) — dev or `?debug=1` on localhost. */
export function DebugTunnelPanel({ showWormholeControls = false, showIntroSequence = false }: DebugTunnelPanelProps): ReactElement | null {
  const [enabled, setEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  /** Dims the viewport behind the panel (scroll/wheel still reach the page — backdrop is inert). */
  const [fullscreenBackdrop, setFullscreenBackdrop] = useState(false);
  const [localhost, setLocalhost] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('debug');
    setEnabled(process.env.NODE_ENV === 'development' || q === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalhost(isLocalhostHostname(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.code !== 'KeyT' || e.metaKey || e.ctrlKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      setPanelOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  const s = useTunnelSnap();

  if (!enabled) return null;

  if (!panelOpen) {
    return (
      <button
        type="button"
        data-no-wheel="true"
        title="Show tunnel debug (Alt+T)"
        className="fixed right-4 top-20 z-[120] rounded-lg border border-violet-500/40 bg-black/85 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-violet-200/90 shadow-lg backdrop-blur-md transition-colors hover:border-violet-400/60 hover:bg-zinc-900/90 hover:text-violet-100"
        onClick={() => setPanelOpen(true)}
      >
        Tunnel debug
      </button>
    );
  }

  return (
    <>
      {fullscreenBackdrop ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[119] bg-black/55 backdrop-blur-[2px]"
        />
      ) : null}
      <div
        data-no-wheel="true"
        className="fixed right-4 top-20 z-[120] flex max-h-[min(90vh,calc(100dvh-5.5rem))] w-72 max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-violet-500/30 bg-black/80 p-3 text-[11px] text-zinc-200 shadow-xl backdrop-blur-md"
      >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <p className="font-semibold text-violet-200">Tunnel debug</p>
        <button
          type="button"
          title="Hide panel (Alt+T)"
          className="shrink-0 rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          onClick={() => setPanelOpen(false)}
        >
          Hide
        </button>
      </div>
      <p className="mb-2 shrink-0 text-[10px] text-zinc-500">Alt+T toggles this panel</p>
      <label className="mb-3 flex shrink-0 cursor-pointer items-center gap-2 rounded border border-zinc-700/80 bg-zinc-950/40 px-2 py-1.5">
        <input
          type="checkbox"
          checked={fullscreenBackdrop}
          onChange={(e) => setFullscreenBackdrop(e.target.checked)}
          className="rounded border-zinc-600"
        />
        <span>Fullscreen backdrop</span>
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
      <label className="mb-1 block">
        zoomRate {s.zoomRate.toFixed(2)}
        <span className="block font-normal text-zinc-500">Scroll zoom / spiral / barrel gain (0.25 = default)</span>
        <input
          type="range"
          min={0}
          max={1000}
          step={0.1}
          value={s.zoomRate}
          onChange={(e) => tunnelStore.setState({ zoomRate: Number(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min={0}
          max={1000}
          step={0.1}
          value={s.zoomRate}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            tunnelStore.setState({ zoomRate: clamp(v, 0, 1000) });
          }}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
        />
      </label>
      <label className="mb-1 block">
        holeRadius {s.holeRadius.toFixed(2)}
        <input
          type="range"
          min={0.1}
          max={0.55}
          step={0.005}
          value={s.holeRadius}
          onChange={(e) => tunnelStore.setState({ holeRadius: Number(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min={0.1}
          max={0.55}
          step={0.005}
          value={s.holeRadius}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            tunnelStore.setState({ holeRadius: clamp(v, 0.1, 0.55) });
          }}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
        />
      </label>
      <label className="mb-1 block">
        iters baseline {s.iters}
        <span className="block font-normal text-zinc-500">Scroll still boosts iterations above this baseline.</span>
        <input
          type="range"
          min={32}
          max={256}
          step={1}
          value={s.iters}
          onChange={(e) => tunnelStore.setState({ iters: Number(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min={32}
          max={256}
          step={1}
          value={s.iters}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            tunnelStore.setState({ iters: Math.round(clamp(v, 32, 256)) });
          }}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
        />
      </label>
      <label className="mb-1 block">
        sensitivity {s.sensitivity.toFixed(3)}
        <input
          type="range"
          min={0.0003}
          max={5}
          step={0.001}
          value={s.sensitivity}
          onChange={(e) => tunnelStore.setState({ sensitivity: Number(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min={0.0003}
          max={5}
          step={0.001}
          value={s.sensitivity}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            tunnelStore.setState({ sensitivity: clamp(v, 0.0003, 5) });
          }}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
        />
      </label>
      <label className="mb-1 block">
        friction {s.friction.toFixed(2)}
        <input
          type="range"
          min={0.75}
          max={0.99}
          step={0.005}
          value={s.friction}
          onChange={(e) => tunnelStore.setState({ friction: Number(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min={0.75}
          max={0.99}
          step={0.005}
          value={s.friction}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            tunnelStore.setState({ friction: clamp(v, 0.75, 0.99) });
          }}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
        />
      </label>
      {showWormholeControls ? (
        <>
          <nav
            className="mb-2 mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em]"
            aria-label="Wormhole lab pages"
          >
            <Link
              href="/wormhole"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole
            </Link>
            <Link
              href="/wormhole2"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 2
            </Link>
            <Link
              href="/wormhole3"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 3
            </Link>
            <Link
              href="/wormhole4"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 4
            </Link>
            <Link
              href="/wormhole5"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 5
            </Link>
            <Link
              href="/wormhole7"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 7
            </Link>
            <Link
              href="/wormhole8"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 8
            </Link>
            <Link
              href="/wormhole9"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Wormhole 9
            </Link>
            <Link
              href="/wormhole10"
              className="rounded border border-emerald-500/35 bg-emerald-950/35 px-2 py-0.5 text-emerald-100/90 hover:border-emerald-400/50 hover:bg-emerald-900/45"
            >
              Wormhole 10
            </Link>
            <Link
              href="/wormhole11"
              className="rounded border border-teal-500/35 bg-teal-950/35 px-2 py-0.5 text-teal-100/90 hover:border-teal-400/50 hover:bg-teal-900/45"
            >
              Wormhole 11
            </Link>
            <Link
              href="/cosmic"
              className="rounded border border-orange-500/35 bg-orange-950/35 px-2 py-0.5 text-orange-100/90 hover:border-orange-400/50 hover:bg-orange-900/45"
            >
              Cosmic
            </Link>
            <Link
              href="/"
              className="rounded border border-cyan-500/35 bg-cyan-950/40 px-2 py-0.5 text-cyan-100/90 hover:border-cyan-400/50 hover:bg-cyan-900/50"
            >
              Home tunnel
            </Link>
          </nav>
          <p className="mb-1 font-semibold text-cyan-200/90">Wormhole (3D)</p>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={s.wormhole3dBackgroundEnabled}
              onChange={(e) => tunnelStore.setState({ wormhole3dBackgroundEnabled: e.target.checked })}
              className="rounded border-zinc-600"
            />
            <span>3D Julia wormhole layer (Three.js)</span>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
            <input
              type="checkbox"
              checked={s.wormholeHelices3dEnabled}
              disabled={!s.wormhole3dBackgroundEnabled}
              onChange={(e) => tunnelStore.setState({ wormholeHelices3dEnabled: e.target.checked })}
              className="rounded border-zinc-600 disabled:opacity-40"
            />
            <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : ''}>
              Show 3D helices (tube strands)
            </span>
          </label>
          <label className="mb-2 block pl-1">
            <span className="mb-1 block leading-snug">
              Atmosphere overlay <span className="text-zinc-500">(vignette)</span>
            </span>
            <select
              value={s.wormholeAtmospherePreset}
              onChange={(e) => {
                const wormholeAtmospherePreset = e.target.value as WormholeAtmospherePreset;
                tunnelStore.setState({ wormholeAtmospherePreset });
                if (localhost) {
                  try {
                    sessionStorage.setItem('nl-wormhole-atmosphere-preset', wormholeAtmospherePreset);
                  } catch {
                    /* ignore */
                  }
                }
              }}
              className="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-violet-500/60"
            >
              {WORMHOLE_ATMOSPHERE_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {id === 'off'
                    ? 'Off'
                    : WORMHOLE_ATMOSPHERE_PRESET_LABELS[id]}
                </option>
              ))}
            </select>
            {localhost ? (
              <span className="mt-1 block text-[10px] text-zinc-500">
                Writes choice to sessionStorage for this tab (re-apply from the menu after route changes if needed)
              </span>
            ) : null}
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
            <input
              type="checkbox"
              checked={s.wormholeCosmicOverlayEnabled}
              onChange={(e) =>
                tunnelStore.setState({ wormholeCosmicOverlayEnabled: e.target.checked })
              }
              className="rounded border-zinc-600"
            />
            <span className="leading-snug">
              Cosmic nebula layer <span className="text-zinc-500">(screen-blend stack on /wormhole5)</span>
            </span>
          </label>
          {localhost ? (
            <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
              <input
                type="checkbox"
                checked={s.wormholeHelixJuliaRibbonShaderEnabled}
                disabled={!s.wormhole3dBackgroundEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeHelixJuliaRibbonShaderEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600 disabled:opacity-40"
              />
              <span
                className={
                  !s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : 'leading-snug'
                }
              >
                Helix lab Julia tube shader{' '}
                <span className="text-zinc-500">(localhost, helixLab routes)</span>
              </span>
            </label>
          ) : null}
          <label className="mb-2 block pl-1">
            <span
              className={
                !s.wormhole3dBackgroundEnabled || !s.wormholeHelixJuliaRibbonShaderEnabled
                  ? 'mb-1 block text-zinc-500'
                  : 'mb-1 block leading-snug'
              }
            >
              Helix tube shader style{' '}
              <span className="text-zinc-500">(1–6 = lab looks; fractal toggle is separate)</span>
            </span>
            <select
              value={s.wormholeHelixTubeVariant}
              disabled={!s.wormhole3dBackgroundEnabled || !s.wormholeHelixJuliaRibbonShaderEnabled}
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeHelixTubeVariant: clampHelixTubeVariant(Number(e.target.value)),
                })
              }
              className="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {WORMHOLE_HELIX_TUBE_VARIANTS.map((id) => (
                <option key={id} value={id}>
                  {WORMHOLE_HELIX_TUBE_LABELS[id as WormholeHelixTubeVariant]}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
            <input
              type="checkbox"
              checked={s.wormholeHelixTubeJuliaPatternEnabled}
              disabled={
                !s.wormhole3dBackgroundEnabled || !s.wormholeHelixJuliaRibbonShaderEnabled
              }
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeHelixTubeJuliaPatternEnabled: e.target.checked,
                })
              }
              className="rounded border-zinc-600 disabled:opacity-40"
            />
            <span
              className={
                !s.wormhole3dBackgroundEnabled || !s.wormholeHelixJuliaRibbonShaderEnabled
                  ? 'text-zinc-500'
                  : 'leading-snug'
              }
            >
              Julia fractal pattern inside helix tubes
            </span>
          </label>
          <label
            className={`mb-2 block pl-1 ${
              !s.wormhole3dBackgroundEnabled ||
              !s.wormholeHelixJuliaRibbonShaderEnabled ||
              !s.wormholeHelixTubeJuliaPatternEnabled
                ? 'text-zinc-500'
                : ''
            }`}
          >
            <span className="mb-1 block leading-snug">
              Helix Julia pattern bloom{' '}
              <span className="text-zinc-500">
                (brightens fractal strand only; uses scene bloom pass)
              </span>
            </span>
            <input
              type="range"
              min={0.25}
              max={3.5}
              step={0.05}
              disabled={
                !s.wormhole3dBackgroundEnabled ||
                !s.wormholeHelixJuliaRibbonShaderEnabled ||
                !s.wormholeHelixTubeJuliaPatternEnabled
              }
              value={clamp(s.wormholeHelixJuliaPatternBloomMul, 0.25, 3.5)}
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeHelixJuliaPatternBloomMul: Number(e.target.value),
                })
              }
              className="w-full disabled:cursor-not-allowed disabled:opacity-45"
            />
            <span className="text-[10px] text-zinc-500">
              ×{s.wormholeHelixJuliaPatternBloomMul.toFixed(2)} — turn fractal pattern on to edit
            </span>
          </label>
          <label
            className={`mb-2 block pl-1 ${
              !s.wormhole3dBackgroundEnabled ||
              !s.wormholeHelixJuliaRibbonShaderEnabled ||
              !s.wormholeHelixTubeJuliaPatternEnabled
                ? 'text-zinc-500'
                : ''
            }`}
          >
            <span className="mb-1 block leading-snug">
              Helix Julia interior blur{' '}
              <span className="text-zinc-500">(multi-sample soften; helps seamy / clipped look)</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              disabled={
                !s.wormhole3dBackgroundEnabled ||
                !s.wormholeHelixJuliaRibbonShaderEnabled ||
                !s.wormholeHelixTubeJuliaPatternEnabled
              }
              value={clamp(s.wormholeHelixJuliaInteriorBlur, 0, 1)}
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeHelixJuliaInteriorBlur: Number(e.target.value),
                })
              }
              className="w-full disabled:cursor-not-allowed disabled:opacity-45"
            />
            <span className="text-[10px] text-zinc-500">{s.wormholeHelixJuliaInteriorBlur.toFixed(2)}</span>
          </label>
          <label
            className={`mb-2 block pl-1 ${
              !s.wormhole3dBackgroundEnabled ||
              !s.wormholeHelixJuliaRibbonShaderEnabled ||
              !s.wormholeHelixTubeJuliaPatternEnabled
                ? 'text-zinc-500'
                : ''
            }`}
          >
            <span className="mb-1 block leading-snug">
              Helix Julia shimmer{' '}
              <span className="text-zinc-500">(slow wave on strand brightness)</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              disabled={
                !s.wormhole3dBackgroundEnabled ||
                !s.wormholeHelixJuliaRibbonShaderEnabled ||
                !s.wormholeHelixTubeJuliaPatternEnabled
              }
              value={clamp(s.wormholeHelixJuliaShimmer, 0, 1)}
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeHelixJuliaShimmer: Number(e.target.value),
                })
              }
              className="w-full disabled:cursor-not-allowed disabled:opacity-45"
            />
            <span className="text-[10px] text-zinc-500">{s.wormholeHelixJuliaShimmer.toFixed(2)}</span>
          </label>
          {localhost ? (
            <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
              <input
                type="checkbox"
                checked={s.wormhole8HelixBoostEnabled}
                disabled={!s.wormhole3dBackgroundEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormhole8HelixBoostEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600 disabled:opacity-40"
              />
              <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : 'leading-snug'}>
                Wormhole 8 ribbon size boost <span className="text-zinc-500">(helixWallInsetMul 5)</span>
              </span>
            </label>
          ) : null}
          <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
            <input
              type="checkbox"
              checked={s.wormholeDebugRandomCamTilt}
              disabled={!s.wormhole3dBackgroundEnabled}
              onChange={(e) => tunnelStore.setState({ wormholeDebugRandomCamTilt: e.target.checked })}
              className="rounded border-zinc-600 disabled:opacity-40"
            />
            <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : ''}>
              Random camera tilt while scrolling (3D)
            </span>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2 pl-1">
            <input
              type="checkbox"
              checked={s.wormholeDebugCircularCamTilt}
              disabled={!s.wormhole3dBackgroundEnabled}
              onChange={(e) =>
                tunnelStore.setState({ wormholeDebugCircularCamTilt: e.target.checked })
              }
              className="rounded border-zinc-600 disabled:opacity-40"
            />
            <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : ''}>
              Subtle circular camera drift (3D)
            </span>
          </label>
          <label className="mb-2 block pl-1">
            <span
              className={
                !s.wormhole3dBackgroundEnabled ? 'mb-1 block text-zinc-500' : 'mb-1 block leading-snug'
              }
            >
              Mouse parallax <span className="text-zinc-500">(slight look-at angle; scroll unchanged)</span>
            </span>
            <select
              value={s.wormholeJourneyMouseParallax}
              disabled={!s.wormhole3dBackgroundEnabled}
              onChange={(e) =>
                tunnelStore.setState({
                  wormholeJourneyMouseParallax: e.target.value as WormholeJourneyMouseParallaxMode,
                })
              }
              className="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-950/90 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {WORMHOLE_JOURNEY_MOUSE_PARALLAX_MODES.map((id) => (
                <option key={id} value={id}>
                  {WORMHOLE_JOURNEY_MOUSE_PARALLAX_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-1 block">
            bloom {s.bloomStrength.toFixed(2)}
            <input
              type="range"
              min={0}
              max={2.5}
              step={0.05}
              value={s.bloomStrength}
              onChange={(e) => tunnelStore.setState({ bloomStrength: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            bloom radius {s.bloomRadius.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={s.bloomRadius}
              onChange={(e) => tunnelStore.setState({ bloomRadius: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            bloom threshold {s.bloomThreshold.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={s.bloomThreshold}
              onChange={(e) => tunnelStore.setState({ bloomThreshold: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            fog density {s.fogDensity.toFixed(4)}
            <input
              type="range"
              min={0.004}
              max={0.06}
              step={0.001}
              value={s.fogDensity}
              onChange={(e) => tunnelStore.setState({ fogDensity: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <p className="mb-1 mt-3 font-semibold text-orange-200/90">Cosmic backdrop</p>
          <p className="mb-2 text-[10px] font-normal text-zinc-500">
            Affects <span className="text-zinc-400">/cosmic</span> and the optional cosmic layer on{' '}
            <span className="text-zinc-400">/wormhole5</span>
          </p>
          <label className="mb-1 block">
            cosmic Julia blend {s.cosmicJuliaBlend.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={s.cosmicJuliaBlend}
              onChange={(e) => tunnelStore.setState({ cosmicJuliaBlend: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            cosmic cloud density {s.cosmicCloudDensity.toFixed(2)}
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={s.cosmicCloudDensity}
              onChange={(e) => tunnelStore.setState({ cosmicCloudDensity: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            cosmic core intensity {s.cosmicCoreIntensity.toFixed(2)}
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={s.cosmicCoreIntensity}
              onChange={(e) => tunnelStore.setState({ cosmicCoreIntensity: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 block">
            cosmic Julia zoom {s.cosmicJuliaZoom.toFixed(2)}
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.05}
              value={s.cosmicJuliaZoom}
              onChange={(e) => tunnelStore.setState({ cosmicJuliaZoom: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="mb-1 mt-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={s.wormholeCoinVisible}
              onChange={(e) => tunnelStore.setState({ wormholeCoinVisible: e.target.checked })}
              className="rounded border-zinc-600"
            />
            <span>Show hero coin</span>
          </label>
          <div className="mb-2 rounded-md border border-amber-900/45 bg-amber-950/25 px-2 py-2">
            <p className="mb-1.5 font-semibold leading-snug text-amber-100/95">
              Gunmetal rim <span className="font-normal text-zinc-500">(coin edge / cylinder)</span>
            </p>
            <label className="mb-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinGunmetalRimSweepLightsEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinGunmetalRimSweepLightsEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">Rim sweep lights (7× orbit / diagonal / vertical)</span>
            </label>
            <label className="mb-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinGunmetalRimEdgeGrazeLightsEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinGunmetalRimEdgeGrazeLightsEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">Near-edge graze lights (3× tight radius)</span>
            </label>
            <label className="mb-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinGunmetalRimTangentRingLightsEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinGunmetalRimTangentRingLightsEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">Tangent ring lights (2× in-plane edge specular)</span>
            </label>
            <label className="mb-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinGunmetalRimUvMotionEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinGunmetalRimUvMotionEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">Reed UV motion (rim texture scroll)</span>
            </label>
            <label className="mb-0 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinGunmetalRimEmissiveShimmerEnabled}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinGunmetalRimEmissiveShimmerEnabled: e.target.checked,
                  })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">Rim emissive shimmer (iridescent cylinder)</span>
            </label>
          </div>
          {pathname === '/wormhole5' ? (
            <label className="mb-1 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormhole5CoinHelixReflectionEnabled}
                onChange={(e) =>
                  tunnelStore.setState({ wormhole5CoinHelixReflectionEnabled: e.target.checked })
                }
                className="rounded border-zinc-600"
              />
              <span className="leading-snug">
                Julia helix ribbon reflections on coin{' '}
                <span className="text-zinc-500">(/wormhole5)</span>
              </span>
            </label>
          ) : null}
          <label className="mb-1 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={s.wormholeBlackHoleOverlayEnabled}
              onChange={(e) =>
                tunnelStore.setState({ wormholeBlackHoleOverlayEnabled: e.target.checked })
              }
              className="rounded border-zinc-600"
            />
            <span>Black hole under coin (radial overlay)</span>
          </label>
        </>
      ) : null}
      <label className="mb-2 flex cursor-pointer items-center gap-2 rounded border border-zinc-700/80 bg-zinc-950/40 px-2 py-1.5">
        <input
          type="checkbox"
          checked={s.wormholeCoinClickTunnelBoost}
          onChange={(e) => tunnelStore.setState({ wormholeCoinClickTunnelBoost: e.target.checked })}
          className="rounded border-zinc-600"
        />
        <span className="leading-snug">
          Coin tap → tunnel scroll boost <span className="text-zinc-500">(localhost)</span>
        </span>
      </label>
      <label className="mb-2 flex cursor-pointer items-center gap-2 rounded border border-zinc-700/80 bg-zinc-950/40 px-2 py-1.5">
        <input
          type="checkbox"
          checked={s.wormholeCoinFadeOnScrollForward}
          onChange={(e) =>
            tunnelStore.setState({ wormholeCoinFadeOnScrollForward: e.target.checked })
          }
          className="rounded border-zinc-600"
        />
        <span className="leading-snug">
          Coin fades when scrolling forward{' '}
          <span className="text-zinc-500">(into the tube; above cruise in locked flight)</span>
        </span>
      </label>
      <label className="mb-2 flex cursor-pointer items-center gap-2 rounded border border-sky-900/40 bg-sky-950/20 px-2 py-1.5">
        <input
          type="checkbox"
          checked={s.wormholeCoinBackdropFaceLightEnabled}
          onChange={(e) =>
            tunnelStore.setState({ wormholeCoinBackdropFaceLightEnabled: e.target.checked })
          }
          className="rounded border-zinc-600"
        />
        <span className="leading-snug">
          Tunnel backdrop on coin faces{' '}
          <span className="text-zinc-500">
            (full-disc emissive toward the tunnel — swaps with spin; follows coin camera)
          </span>
        </span>
      </label>
      <p className="mt-2 text-zinc-400">
        depth {s.depth.toFixed(2)} · vel {s.velocity.toFixed(2)}
      </p>
      {showIntroSequence && pathname === '/wormhole5' ? <LabIntroDebugSection /> : null}
      <button
        type="button"
        className="mt-2 w-full rounded border border-zinc-600 py-1 text-zinc-300 hover:bg-zinc-800"
        onClick={() => tunnelStore.reset()}
      >
        Reset store
      </button>
      </div>
    </div>
    </>
  );
}
