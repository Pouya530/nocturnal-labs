'use client';

import type { ReactElement } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { warmWormhole5AmbientAudio } from '@/audio/wormhole5AmbientAudio';
import { isLocalhostHostname } from '@/lib/isLocalhost';
import {
  computeWormholeCoinFollowCam,
  wormholeCoinScaleFromDepth,
} from '@/lib/wormholeCoinFollowCam';
import {
  rebuildWormholeCoinScrollCamera,
  wormholeCoinScrollCameraStorePatch,
  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS,
} from '@/lib/wormholeCoinScrollCamera';
import {
  TUNNEL_STORE_DEFAULT_SCROLL,
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT,
  WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX,
  WORMHOLE_HOME_TUNNEL_VISUAL,
  WORMHOLE5_DEBUG_START,
  WORMHOLE5_TUNNEL_LAB_DEFAULTS,
  WORMHOLE20_TUNNEL_LAB_DEFAULTS,
  WORMHOLE_JULIA_AMBIENT_SYNC_RATE_MAX,
} from '@/lib/wormholePageConfig';
import {
  getHeroFocalPointSnapshot,
  subscribeHeroFocalCssVars,
} from '@/lib/wormholeHeroFocalPoint';
import { HERO_FOCAL_CAM_LOOK_MUL_WORMHOLE5_LAB } from '@/lib/wormholeHeroFocalCamera';
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
import { JuliaAmbientEqualizerMonitor } from '@/components/landing/JuliaAmbientEqualizerMonitor';
import { JuliaAmbientSyncMonitor } from '@/components/landing/JuliaAmbientSyncMonitor';
import { LabIntroDebugSection } from '@/components/wormhole/LabIntroDebugSection';
import { HelixQualityDebugSection } from '@/components/landing/HelixQualityDebugSection';
import { HeroCoinSizeDebugSection } from '@/components/landing/HeroCoinSizeDebugSection';
import { TunnelQualityDebugSection } from '@/components/landing/TunnelQualityDebugSection';

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

function isAmbientJuliaDebugRoute(pathname: string | null, localhost: boolean): boolean {
  const p = (pathname ?? '').replace(/\/$/, '') || '/';
  if (p === '/wormhole5' || p === '/wormhole20') return true;
  if (localhost && p === '/') return true;
  return false;
}

function isWormhole5LabPath(pathname: string | null): boolean {
  return pathname === '/wormhole5' || pathname === '/wormhole5/';
}

function isHeroCoinSizeDebugRoute(pathname: string | null): boolean {
  const p = pathname?.replace(/\/$/, '') ?? '';
  return p === '/' || p === '/wormhole5' || p === '/wormhole20';
}

function useWormhole5LabHeroFocalReadout() {
  return useSyncExternalStore(
    subscribeHeroFocalCssVars,
    () => getHeroFocalPointSnapshot('wormhole5Lab'),
    () => getHeroFocalPointSnapshot('wormhole5Lab'),
  );
}

function scrollVisualDefaultsForPath(pathname: string | null): {
  zoomRate: number;
  holeRadius: number;
  label: string;
} {
  if (
    pathname === '/wormhole5' ||
    pathname === '/wormhole5/' ||
    pathname === '/wormhole20' ||
    pathname === '/wormhole20/' ||
    pathname === '/'
  ) {
    return {
      ...WORMHOLE_HOME_TUNNEL_VISUAL,
      label: pathname === '/' ? 'home /' : '/wormhole5',
    };
  }
  return {
    ...TUNNEL_STORE_DEFAULT_SCROLL,
    label: 'generic',
  };
}

const RANDOM_CAM_TILT_AMOUNT_STORAGE_KEY = 'nl-wormhole-random-cam-tilt-amount';
const JULIA_AMBIENT_SYNC_STORAGE_KEY = 'nl-wormhole-julia-ambient-sync';
const JULIA_AMBIENT_SYNC_RATE_STORAGE_KEY = 'nl-wormhole-julia-ambient-sync-rate';

function readStoredRandomCamTiltAmount(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(RANDOM_CAM_TILT_AMOUNT_STORAGE_KEY);
  if (raw == null) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
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
  const onWormhole5Lab = isWormhole5LabPath(pathname);
  const wormhole5LabFocal = useWormhole5LabHeroFocalReadout();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('debug');
    setEnabled(process.env.NODE_ENV === 'development' || q === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalhost(isLocalhostHostname(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!localhost) return;
    const stored = readStoredRandomCamTiltAmount();
    if (stored == null) return;
    tunnelStore.setState({
      wormholeDebugRandomCamTiltAmount: clamp(
        stored,
        0,
        WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX,
      ),
    });
  }, [localhost]);

  useEffect(() => {
    if (!localhost || typeof window === 'undefined') return;
    const onAmbientLab = isAmbientJuliaDebugRoute(pathname, true);
    const syncRaw = localStorage.getItem(JULIA_AMBIENT_SYNC_STORAGE_KEY);
    const rateRaw = localStorage.getItem(JULIA_AMBIENT_SYNC_RATE_STORAGE_KEY);
    const partial: {
      wormholeDebugJuliaAmbientSync?: boolean;
      wormholeDebugJuliaAmbientSyncRate?: number;
    } = {};
    if (syncRaw === '1') partial.wormholeDebugJuliaAmbientSync = true;
    if (syncRaw === '0') partial.wormholeDebugJuliaAmbientSync = false;
    if (rateRaw != null) {
      const v = Number(rateRaw);
      if (Number.isFinite(v)) {
        partial.wormholeDebugJuliaAmbientSyncRate = clamp(v, 0.25, WORMHOLE_JULIA_AMBIENT_SYNC_RATE_MAX);
      }
    } else if (onAmbientLab && syncRaw == null) {
      const lab =
        pathname === '/wormhole20' || pathname === '/wormhole20/'
          ? WORMHOLE20_TUNNEL_LAB_DEFAULTS
          : WORMHOLE5_TUNNEL_LAB_DEFAULTS;
      partial.wormholeDebugJuliaAmbientSync = lab.wormholeDebugJuliaAmbientSync;
      partial.wormholeDebugJuliaAmbientSyncRate = lab.wormholeDebugJuliaAmbientSyncRate;
    }
    if (Object.keys(partial).length > 0) {
      tunnelStore.setState(partial);
    }
  }, [localhost, pathname]);

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
  const scrollDefaults = scrollVisualDefaultsForPath(pathname);

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
      <div className="mb-2 rounded-md border border-zinc-700/80 bg-zinc-950/40 px-2 py-2">
        <p className="mb-1.5 font-semibold leading-snug text-zinc-200">
          Scroll / void <span className="font-normal text-zinc-500">({scrollDefaults.label})</span>
        </p>
        <p className="mb-2 text-[10px] leading-snug text-zinc-500">
          Route start: zoomRate {scrollDefaults.zoomRate.toFixed(0)}, holeRadius{' '}
          {scrollDefaults.holeRadius.toFixed(2)}
          {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
            <>
              {' '}
              — reload page if sliders show {TUNNEL_STORE_DEFAULT_SCROLL.zoomRate} /{' '}
              {TUNNEL_STORE_DEFAULT_SCROLL.holeRadius.toFixed(2)} (stale store).
            </>
          ) : null}
        </p>
        <button
          type="button"
          className="mb-2 w-full rounded border border-violet-600/50 bg-violet-950/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-200/90 hover:bg-violet-900/50"
          onClick={() =>
            tunnelStore.setState({
              zoomRate: scrollDefaults.zoomRate,
              holeRadius: scrollDefaults.holeRadius,
              ...(onWormhole5Lab
                ? {
                    ...WORMHOLE5_DEBUG_START,
                    wormholeAtmospherePreset: WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeAtmospherePreset,
                    bloomStrength: WORMHOLE5_TUNNEL_LAB_DEFAULTS.bloomStrength,
                    wormholeDebugJuliaAmbientSync:
                      WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSync,
                    wormholeDebugJuliaAmbientSyncRate:
                      WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate,
                    wormholeDebugHeroFocalSync:
                      WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugHeroFocalSync,
                    wormholeDebugDriftMotesIdleBuzz:
                      WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugDriftMotesIdleBuzz,
                  }
                : {}),
            })
          }
        >
          Reset to route defaults
        </button>
        <label className="mb-1 block">
          zoomRate {s.zoomRate.toFixed(2)}
          <span className="block font-normal text-zinc-500">
            Scroll zoom / spiral / barrel gain
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={clamp(s.zoomRate, 0, 1000)}
            onChange={(e) => tunnelStore.setState({ zoomRate: Number(e.target.value) })}
            className="w-full"
          />
          <input
            type="number"
            min={0}
            max={1000}
            step={1}
            value={s.zoomRate}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              tunnelStore.setState({ zoomRate: clamp(v, 0, 1000) });
            }}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-100"
          />
        </label>
        <label className="mb-0 block">
          holeRadius {s.holeRadius.toFixed(3)}
          <span className="block font-normal text-zinc-500">Inner void (shader uHoleRadius)</span>
          <input
            type="range"
            min={0.1}
            max={0.55}
            step={0.005}
            value={clamp(s.holeRadius, 0.1, 0.55)}
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
      </div>
      {isHeroCoinSizeDebugRoute(pathname) ? (
        <HeroCoinSizeDebugSection localhost={localhost} />
      ) : null}
      {onWormhole5Lab ? (
        <div className="mb-2 rounded-md border border-emerald-800/35 bg-emerald-950/15 px-2 py-2">
          <p className="mb-1 text-[10px] font-semibold leading-snug text-emerald-100/90">
            Hero coin focal <span className="font-normal text-zinc-500">(/wormhole5)</span>
          </p>
          <p className="mb-1 text-[10px] leading-snug text-zinc-400">
            Coin CSS: x {wormhole5LabFocal.focal.x.toFixed(2)}, y{' '}
            {wormhole5LabFocal.focal.y.toFixed(2)} (HERO_FOCAL_POINT_WORMHOLE5_LAB). Camera Y mul{' '}
            {HERO_FOCAL_CAM_LOOK_MUL_WORMHOLE5_LAB.y.toFixed(1)} (tunnel lookAt tracks focal).
          </p>
          <p className="text-[10px] leading-snug text-zinc-500">
            Tunnel lookAt follows coin focal on this route (always on). holeRadius only scales the shader
            void — use reset below if store is stale.
          </p>
        </div>
      ) : null}
      {!onWormhole5Lab ? (
        <label className="mb-3 flex cursor-pointer items-center gap-2 rounded border border-emerald-700/40 bg-emerald-950/25 px-2 py-1.5">
          <input
            type="checkbox"
            checked={s.wormholeDebugHeroFocalSync}
            disabled={!s.wormhole3dBackgroundEnabled}
            onChange={(e) =>
              tunnelStore.setState({ wormholeDebugHeroFocalSync: e.target.checked })
            }
            className="rounded border-zinc-600 disabled:opacity-40"
          />
          <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : 'leading-snug'}>
            Hero focal ↔ tunnel mouth{' '}
            <span className="text-zinc-500">(tunnel lookAt follows coin anchor)</span>
          </span>
        </label>
      ) : null}
      {!onWormhole5Lab && !s.wormholeDebugHeroFocalSync ? (
        <p className="mb-3 rounded border border-amber-600/40 bg-amber-950/20 px-2 py-1.5 text-[10px] leading-snug text-amber-100/90">
          Sync is off — coin uses the lab focal point but the tunnel aims at screen centre, which reads
          as a mis-centred logo.
        </p>
      ) : null}
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
            {localhost ? (
              <Link
                href="/wormhole20"
                className="rounded border border-fuchsia-500/35 bg-fuchsia-950/35 px-2 py-0.5 text-fuchsia-100/90 hover:border-fuchsia-400/50 hover:bg-fuchsia-900/45"
                title="Wormhole5 + FFT equalizer (npm run dev → :3001)"
              >
                Wormhole 20
              </Link>
            ) : null}
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
          <TunnelQualityDebugSection />
          <HelixQualityDebugSection />
          <label className="mb-2 block pl-1">
            <span className="mb-1 block leading-snug">
              Atmosphere overlay <span className="text-zinc-500">(vignette)</span>
            </span>
            {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
              <span className="mb-1 block text-[10px] text-zinc-500">
                Route default:{' '}
                {WORMHOLE_ATMOSPHERE_PRESET_LABELS[WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeAtmospherePreset]}
              </span>
            ) : null}
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
          <div className="mb-3 rounded border border-amber-500/30 bg-zinc-950/50 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200/90">
              Coin-follow journey camera{' '}
              <span className="font-normal text-zinc-500">(wormhole5 / dev)</span>
            </p>
            <p className="mb-2 text-[9px] leading-snug text-zinc-500">
              Tunnel + hero coin cameras dolly in as depth shrinks the coin (scroll into the tube).
              Pairs with journey camera on helix+ring routes.
            </p>
            <label className="mb-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.wormholeCoinFollowCamEnabled}
                disabled={!s.wormhole3dBackgroundEnabled}
                onChange={(e) =>
                  tunnelStore.setState({ wormholeCoinFollowCamEnabled: e.target.checked })
                }
                className="rounded border-zinc-600 disabled:opacity-40"
              />
              <span className={!s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : 'text-[11px]'}>
                Follow coin shrink (tunnel + coin GL)
              </span>
            </label>
            <label className="mb-1 block">
              <span className="mb-1 flex justify-between text-[10px] text-zinc-400">
                <span>Follow strength</span>
                <span className="tabular-nums text-zinc-300">
                  {s.wormholeCoinFollowCamStrength.toFixed(2)}×
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                disabled={!s.wormhole3dBackgroundEnabled || !s.wormholeCoinFollowCamEnabled}
                value={s.wormholeCoinFollowCamStrength}
                onChange={(e) =>
                  tunnelStore.setState({
                    wormholeCoinFollowCamStrength: Number(e.target.value),
                  })
                }
                className="w-full disabled:cursor-not-allowed disabled:opacity-45"
              />
            </label>
            {(() => {
              const coinScale = wormholeCoinScaleFromDepth(s.depth, s.maxDepth);
              const follow = computeWormholeCoinFollowCam({
                enabled: s.wormholeCoinFollowCamEnabled,
                strength: s.wormholeCoinFollowCamStrength,
                depth: s.depth,
                maxDepth: s.maxDepth,
                velocity: s.velocity,
              });
              return (
                <p className="text-[9px] tabular-nums text-zinc-500">
                  coin scale {(coinScale * 100).toFixed(0)}% · shrink{' '}
                  {(follow.shrink01 * 100).toFixed(0)}% · tunnel Δz {follow.dollyZ.toFixed(2)} · Δfov{' '}
                  {follow.fovAdd.toFixed(2)}
                </p>
              );
            })()}
            <button
              type="button"
              disabled={!s.wormhole3dBackgroundEnabled}
              className="mt-2 w-full rounded border border-dashed border-zinc-600 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
              onClick={() =>
                tunnelStore.setState({
                  wormholeCoinFollowCamEnabled:
                    WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeCoinFollowCamEnabled,
                  wormholeCoinFollowCamStrength:
                    WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeCoinFollowCamStrength,
                })
              }
            >
              Reset wormhole5 defaults
            </button>
          </div>
          <div className="mb-3 rounded border border-sky-500/30 bg-zinc-950/50 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200/90">
              Coin scroll camera{' '}
              <span className="font-normal text-zinc-500">(LogoCoin GL / spinSyncScroll)</span>
            </p>
            <p className="mb-2 text-[9px] leading-snug text-zinc-500">
              Locked mode: scroll into the journey zooms the coin camera out; scroll back zooms in.
              Speed layer adds extra pull-back on fast scroll (desktop). Rebuild remounts the coin GL
              canvas so smoothed scroll velocity resets — use after tweaking sliders.
            </p>
            {(
              [
                [
                  'Zoom out Z (into journey)',
                  'wormholeCoinScrollCamLockedZPullDown',
                  0,
                  8,
                  0.05,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedZPullDown,
                ],
                [
                  'Zoom out FOV',
                  'wormholeCoinScrollCamLockedFovDown',
                  0,
                  20,
                  0.1,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedFovDown,
                ],
                [
                  'Zoom in Z (scroll back)',
                  'wormholeCoinScrollCamLockedZPushUp',
                  0,
                  4,
                  0.05,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedZPushUp,
                ],
                [
                  'Zoom in FOV',
                  'wormholeCoinScrollCamLockedFovUp',
                  0,
                  12,
                  0.1,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedFovUp,
                ],
                [
                  'Speed Z pull-back',
                  'wormholeCoinScrollCamLockedZSpeedAway',
                  0,
                  3,
                  0.05,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedZSpeedAway,
                ],
                [
                  'Speed FOV widen',
                  'wormholeCoinScrollCamLockedFovSpeedAway',
                  0,
                  8,
                  0.1,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedFovSpeedAway,
                ],
                [
                  'Speed reference (velRef)',
                  'wormholeCoinScrollCamVelRef',
                  20,
                  160,
                  1,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.velRef,
                ],
                [
                  'Locked vel scale',
                  'wormholeCoinScrollCamLockedVelScale',
                  1,
                  5,
                  0.05,
                  WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS.lockedVelScale,
                ],
              ] as const
            ).map(([label, key, min, max, step, def]) => (
              <label key={key} className="mb-1.5 block">
                <span className="mb-0.5 flex justify-between text-[10px] text-zinc-400">
                  <span>{label}</span>
                  <span className="tabular-nums text-zinc-300">
                    {s[key].toFixed(step >= 1 ? 0 : 2)}
                    <span className="text-zinc-600"> · def {def.toFixed(step >= 1 ? 0 : 2)}</span>
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={s[key]}
                  onChange={(e) =>
                    tunnelStore.setState({ [key]: Number(e.target.value) } as Partial<
                      ReturnType<typeof tunnelStore.getState>
                    >)
                  }
                  className="w-full"
                />
              </label>
            ))}
            <p className="mb-2 text-[9px] tabular-nums text-zinc-500">
              vel {s.velocity.toFixed(2)} · locked scale {s.wormholeCoinScrollCamLockedVelScale.toFixed(2)}
              {' · '}
              revision {s.wormholeCoinScrollCamRevision}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="flex-1 rounded border border-sky-600/50 bg-sky-950/40 px-2 py-1 text-[10px] text-sky-100/90 hover:bg-sky-900/50"
                onClick={() => rebuildWormholeCoinScrollCamera()}
              >
                Rebuild coin scene
              </button>
              <button
                type="button"
                className="rounded border border-dashed border-zinc-600 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                onClick={() => {
                  tunnelStore.setState({
                    ...wormholeCoinScrollCameraStorePatch(WORMHOLE_COIN_SCROLL_CAMERA_DEFAULTS),
                    wormholeCoinScrollCamRevision: s.wormholeCoinScrollCamRevision + 1,
                  });
                }}
              >
                Reset defaults
              </button>
            </div>
          </div>
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
          <label className="mb-2 block pl-6">
            <span
              className={
                !s.wormhole3dBackgroundEnabled || !s.wormholeDebugRandomCamTilt
                  ? 'mb-1 block text-zinc-500'
                  : 'mb-1 block leading-snug'
              }
            >
              Random cam tilt amount{' '}
              <span className="text-zinc-500">
                ({s.wormholeDebugRandomCamTiltAmount.toFixed(2)}× — 0 off,{' '}
                {WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_DEFAULT.toFixed(1)} default)
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX}
              step={0.05}
              disabled={!s.wormhole3dBackgroundEnabled || !s.wormholeDebugRandomCamTilt}
              value={s.wormholeDebugRandomCamTiltAmount}
              onChange={(e) => {
                const v = clamp(
                  Number((e.target as HTMLInputElement).value),
                  0,
                  WORMHOLE_DEBUG_RANDOM_CAM_TILT_AMOUNT_MAX,
                );
                tunnelStore.setState({ wormholeDebugRandomCamTiltAmount: v });
                if (localhost) {
                  localStorage.setItem(RANDOM_CAM_TILT_AMOUNT_STORAGE_KEY, String(v));
                }
              }}
              className="w-full disabled:cursor-not-allowed disabled:opacity-45"
            />
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
            {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
              <span className="block font-normal text-zinc-500">
                Route default: {WORMHOLE5_TUNNEL_LAB_DEFAULTS.bloomStrength.toFixed(2)}
              </span>
            ) : null}
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
          {isAmbientJuliaDebugRoute(pathname, localhost) ? (
            <>
              <div className="mb-2 rounded-md border border-violet-900/50 bg-violet-950/20 px-2 py-2">
                <p className="mb-1.5 font-semibold leading-snug text-violet-100/95">
                  Ambient MP3{' '}
                  <span className="font-normal text-zinc-500">
                    ({pathname === '/wormhole20' || pathname === '/wormhole20/'
                      ? '/wormhole20'
                      : pathname === '/' || pathname === ''
                        ? '/'
                        : '/wormhole5'})
                  </span>
                </p>
                <p className="mb-2 text-[10px] leading-snug text-zinc-500">
                  Route default: sync on, rate{' '}
                  {WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate.toFixed(2)}× (audio
                  seconds → uTime)
                </p>
                <button
                  type="button"
                  className="mb-2 w-full rounded border border-violet-600/50 bg-violet-950/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-200/90 hover:bg-violet-900/50"
                  onClick={() => {
                    tunnelStore.setState({
                      wormholeDebugJuliaAmbientSync:
                        WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSync,
                      wormholeDebugJuliaAmbientSyncRate:
                        WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate,
                    });
                    warmWormhole5AmbientAudio();
                    if (localhost) {
                      localStorage.setItem(JULIA_AMBIENT_SYNC_STORAGE_KEY, '1');
                      localStorage.setItem(
                        JULIA_AMBIENT_SYNC_RATE_STORAGE_KEY,
                        String(WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate),
                      );
                    }
                  }}
                >
                  Reset ambient / Julia sync defaults
                </button>
                <JuliaAmbientSyncMonitor
                  active={panelOpen}
                  syncEnabled={s.wormholeDebugJuliaAmbientSync}
                  syncRate={s.wormholeDebugJuliaAmbientSyncRate}
                />
                <label className="mb-1 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.wormholeDebugJuliaAmbientSync}
                    disabled={!s.wormhole3dBackgroundEnabled}
                    onChange={(e) => {
                      const on = e.target.checked;
                      tunnelStore.setState({ wormholeDebugJuliaAmbientSync: on });
                      if (on) warmWormhole5AmbientAudio();
                      if (localhost) {
                        localStorage.setItem(JULIA_AMBIENT_SYNC_STORAGE_KEY, on ? '1' : '0');
                      }
                    }}
                    className="rounded border-zinc-600 disabled:opacity-40"
                  />
                  <span
                    className={
                      !s.wormhole3dBackgroundEnabled ? 'text-zinc-500' : 'leading-snug'
                    }
                  >
                    Sync Julia pattern to ambient track (helix + rings + sky)
                  </span>
                </label>
                <label className="mb-0 block pl-6">
                  <span
                    className={
                      !s.wormhole3dBackgroundEnabled || !s.wormholeDebugJuliaAmbientSync
                        ? 'mb-1 block text-zinc-500'
                        : 'mb-1 block leading-snug'
                    }
                  >
                    Sync rate{' '}
                    <span className="text-zinc-500">
                      ({s.wormholeDebugJuliaAmbientSyncRate.toFixed(2)}× — default{' '}
                      {WORMHOLE5_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientSyncRate.toFixed(2)}×)
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.25}
                    max={WORMHOLE_JULIA_AMBIENT_SYNC_RATE_MAX}
                    step={0.05}
                    disabled={!s.wormhole3dBackgroundEnabled || !s.wormholeDebugJuliaAmbientSync}
                    value={s.wormholeDebugJuliaAmbientSyncRate}
                    onChange={(e) => {
                      const v = clamp(
                        Number(e.target.value),
                        0.25,
                        WORMHOLE_JULIA_AMBIENT_SYNC_RATE_MAX,
                      );
                      tunnelStore.setState({ wormholeDebugJuliaAmbientSyncRate: v });
                      warmWormhole5AmbientAudio();
                      if (localhost) {
                        localStorage.setItem(JULIA_AMBIENT_SYNC_RATE_STORAGE_KEY, String(v));
                      }
                    }}
                    className="w-full disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </label>
                <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">
                  Press ENTER on the preloader and play ambient audio; pattern freezes when paused.
                </p>
                {pathname === '/wormhole20' || pathname === '/wormhole20/' ? (
                  <>
                    <JuliaAmbientEqualizerMonitor
                      active={panelOpen}
                      enabled={s.wormholeDebugJuliaAmbientEqualizer}
                      strength={s.wormholeDebugJuliaAmbientEqualizerStrength}
                    />
                    <label className="mb-1 mt-2 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.wormholeDebugJuliaAmbientEqualizer}
                        disabled={!s.wormhole3dBackgroundEnabled}
                        onChange={(e) =>
                          tunnelStore.setState({
                            wormholeDebugJuliaAmbientEqualizer: e.target.checked,
                          })
                        }
                        className="rounded border-zinc-600 disabled:opacity-40"
                      />
                      <span className="leading-snug">
                        FFT equalizer (bass / mids / highs → Julia intensity + shimmer)
                      </span>
                    </label>
                    <label className="mb-0 block pl-6">
                      <span
                        className={
                          !s.wormhole3dBackgroundEnabled || !s.wormholeDebugJuliaAmbientEqualizer
                            ? 'mb-1 block text-zinc-500'
                            : 'mb-1 block leading-snug'
                        }
                      >
                        Equalizer strength{' '}
                        <span className="text-zinc-500">
                          ({s.wormholeDebugJuliaAmbientEqualizerStrength.toFixed(2)})
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        disabled={
                          !s.wormhole3dBackgroundEnabled || !s.wormholeDebugJuliaAmbientEqualizer
                        }
                        value={s.wormholeDebugJuliaAmbientEqualizerStrength}
                        onChange={(e) =>
                          tunnelStore.setState({
                            wormholeDebugJuliaAmbientEqualizerStrength: clamp(
                              Number(e.target.value),
                              0,
                              2,
                            ),
                          })
                        }
                        className="w-full disabled:cursor-not-allowed disabled:opacity-45"
                      />
                    </label>
                    <button
                      type="button"
                      className="mt-2 w-full rounded border border-fuchsia-600/50 bg-fuchsia-950/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-fuchsia-200/90 hover:bg-fuchsia-900/50"
                      onClick={() =>
                        tunnelStore.setState({
                          wormholeDebugJuliaAmbientEqualizer:
                            WORMHOLE20_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientEqualizer,
                          wormholeDebugJuliaAmbientEqualizerStrength:
                            WORMHOLE20_TUNNEL_LAB_DEFAULTS.wormholeDebugJuliaAmbientEqualizerStrength,
                        })
                      }
                    >
                      Reset equalizer defaults
                    </button>
                  </>
                ) : null}
              </div>
              {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
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
              {pathname === '/wormhole5' ||
              pathname === '/wormhole5/' ||
              pathname === '/wormhole20' ||
              pathname === '/wormhole20/' ? (
                <label className="mb-1 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.wormhole5CoinDriftMoteFaceReflectionEnabled}
                    onChange={(e) =>
                      tunnelStore.setState({
                        wormhole5CoinDriftMoteFaceReflectionEnabled: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-600"
                  />
                  <span className="leading-snug">
                    Drift-mote buzz reflections on coin faces{' '}
                    <span className="text-zinc-500">
                      (virtual stand-ins — flank sweeps + ahead-mote curve; wormhole5 / wormhole20)
                    </span>
                  </span>
                </label>
              ) : null}
              {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
                <label className="mb-1 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.wormhole5CoinDriftMoteLiveParticleReflectionEnabled}
                    onChange={(e) =>
                      tunnelStore.setState({
                        wormhole5CoinDriftMoteLiveParticleReflectionEnabled: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-600"
                  />
                  <span className="leading-snug">
                    Live tunnel particles on coin faces{' '}
                    <span className="text-zinc-500">
                      (debug — up to 12 real motes projected; overrides virtual glints)
                    </span>
                  </span>
                </label>
              ) : null}
              {pathname === '/wormhole5' || pathname === '/wormhole5/' ? (
                <div className="mb-2 rounded-md border border-sky-900/45 bg-sky-950/25 px-2 py-2">
                  <p className="mb-1.5 font-semibold leading-snug text-sky-100/95">
                    Cinematic spin lighting{' '}
                    <span className="font-normal text-zinc-500">(/wormhole5 coin)</span>
                  </p>
                  <label className="mb-0 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.wormhole5CoinCinematicSpinLightingEnabled}
                      onChange={(e) =>
                        tunnelStore.setState({
                          wormhole5CoinCinematicSpinLightingEnabled: e.target.checked,
                        })
                      }
                      className="rounded border-zinc-600"
                    />
                    <span className="leading-snug">
                      Polished metal — left/right keys, env fill, edge blink, bloom glints
                    </span>
                  </label>
                </div>
              ) : null}
            </>
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
      {showIntroSequence &&
      (pathname === '/wormhole5' ||
        pathname === '/wormhole5/' ||
        pathname === '/wormhole20' ||
        pathname === '/wormhole20/') ? (
        <LabIntroDebugSection />
      ) : null}
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
