'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

import { tunnelStore } from '@/tunnel/tunnelStore';

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
};

/** Native debug controls (Leva substitute) — dev or `?debug=1` on localhost. */
export function DebugTunnelPanel({ showWormholeControls = false }: DebugTunnelPanelProps): ReactElement | null {
  const [enabled, setEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  /** Dims the viewport behind the panel (scroll/wheel still reach the page — backdrop is inert). */
  const [fullscreenBackdrop, setFullscreenBackdrop] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('debug');
    setEnabled(process.env.NODE_ENV === 'development' || q === '1');
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
          <label className="mb-1 mt-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={s.wormholeCoinVisible}
              onChange={(e) => tunnelStore.setState({ wormholeCoinVisible: e.target.checked })}
              className="rounded border-zinc-600"
            />
            <span>Show hero coin</span>
          </label>
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
      <p className="mt-2 text-zinc-400">
        depth {s.depth.toFixed(2)} · vel {s.velocity.toFixed(2)}
      </p>
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
