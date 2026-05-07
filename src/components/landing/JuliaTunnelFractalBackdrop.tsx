'use client';

import type { MutableRefObject, ReactElement } from 'react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Capability, initCapability } from '@/core/capability';
import { motionPrefs } from '@/core/motion';
import { tunnelStore } from '@/tunnel/tunnelStore';
import { juliaFractalFrag, juliaFractalVertCover } from '@/visuals/shaders/juliaFractalShaderSources';

/** Julia base c — frozen at canonical Cymatics point (same as production Julia). */
const J_BASE_CR = -0.7269;
const J_BASE_CI = 0.1889;

const JULIA_ZOOM = 0.48;
const INTRO_ZOOM_LERP = 0.35;
const MAX_DEPTH = 256;
/** Matches `tunnelStore.zoomRate` default — slider multiplies scroll zoom vs this baseline. */
const ZOOM_RATE_BASE = 0.25;

const INTRO_T_DEFAULT: MutableRefObject<number> = { current: 1 };

const COVER_TRI = new Float32Array([-1, -1, 3, -1, -1, 3]);

function smoothstep3(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[JuliaTunnel] shader compile', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('[JuliaTunnel] program link', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

/** 0…1 from wheel depth — bounded in free-fly so zoom/palette stay stable. */
function scrollDriveNorm(depth: number, mode: 'locked' | 'free'): number {
  if (mode === 'locked') {
    return Math.min(1, Math.max(0, depth / MAX_DEPTH));
  }
  return (Math.atan(depth / 42) / (Math.PI * 0.5) + 1) * 0.5;
}

export type JuliaTunnelFractalBackdropProps = {
  introTRef?: MutableRefObject<number>;
};

/**
 * Localhost tunnel mode: **same** `juliaFractalFrag` as production Julia — no idle orbit.
 * Zoom, spiral, palette shift, and slow pan come **only** from `tunnelStore` depth / velocity
 * (mouse wheel, keys, free-fly touch) via `useScrollDepth`.
 */
export function JuliaTunnelFractalBackdrop({
  introTRef: introTRefProp = INTRO_T_DEFAULT,
}: JuliaTunnelFractalBackdropProps): ReactElement {
  const introTRef = introTRefProp;
  const reduced = useSyncExternalStore(motionPrefs.subscribe, () => motionPrefs.reduced, () => false);
  const [tier, setTier] = useState(2);
  const [useCss, setUseCss] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const locRef = useRef<{
    uResolution: WebGLUniformLocation | null;
    uC: WebGLUniformLocation | null;
    uZoom: WebGLUniformLocation | null;
    uMaxIter: WebGLUniformLocation | null;
    uPaletteOffset: WebGLUniformLocation | null;
    uColorIntensity: WebGLUniformLocation | null;
    uSpiralPhase: WebGLUniformLocation | null;
    uViewAngle: WebGLUniformLocation | null;
    uBarrelK: WebGLUniformLocation | null;
    uFractalMode: WebGLUniformLocation | null;
    aPos: number;
  } | null>(null);

  const dprRef = useRef(1);
  const bufRef = useRef<WebGLBuffer | null>(null);

  const maxIterBase = tier >= 3 ? 240 : tier >= 2 ? 200 : 150;

  useEffect(() => {
    void initCapability().then(() => {
      dprRef.current = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      setTier(Capability.tier());
    });
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    dprRef.current = Math.min(2, Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));

    const attr: WebGLContextAttributes = { alpha: false, antialias: true, powerPreference: 'high-performance' };
    const gl =
      (canvas.getContext('webgl', attr) as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl' as 'webgl', attr) as WebGLRenderingContext | null);
    if (!gl) {
      console.warn('[JuliaTunnel] no WebGL1 context; showing CSS fallback');
      setUseCss(true);
      return;
    }

    const program = createProgram(gl, juliaFractalVertCover, juliaFractalFrag);
    if (!program) {
      setUseCss(true);
      return;
    }
    programRef.current = program;
    glRef.current = gl;

    const aPos = gl.getAttribLocation(program, 'aPos');
    locRef.current = {
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uC: gl.getUniformLocation(program, 'uC'),
      uZoom: gl.getUniformLocation(program, 'uZoom'),
      uMaxIter: gl.getUniformLocation(program, 'uMaxIter'),
      uPaletteOffset: gl.getUniformLocation(program, 'uPaletteOffset'),
      uColorIntensity: gl.getUniformLocation(program, 'uColorIntensity'),
      uSpiralPhase: gl.getUniformLocation(program, 'uSpiralPhase'),
      uViewAngle: gl.getUniformLocation(program, 'uViewAngle'),
      uBarrelK: gl.getUniformLocation(program, 'uBarrelK'),
      uFractalMode: gl.getUniformLocation(program, 'uFractalMode'),
      aPos,
    };

    const buf = gl.createBuffer();
    if (!buf) {
      setUseCss(true);
      return;
    }
    bufRef.current = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, COVER_TRI, gl.STATIC_DRAW);

    const setSize = () => {
      const d = dprRef.current;
      const w = Math.max(1, Math.floor(window.innerWidth * d));
      const h = Math.max(1, Math.floor(window.innerHeight * d));
      canvas.width = w;
      canvas.height = h;
    };
    setSize();

    const draw = () => {
      const g = glRef.current;
      const p = programRef.current;
      const L = locRef.current;
      if (!g || !p || !L) return;

      const store = tunnelStore.getState();

      const rawIntro = introTRef.current;
      const introT = Math.min(1, Math.max(0, rawIntro));
      const easeT = smoothstep3(introT);
      const zoomFrom = JULIA_ZOOM - INTRO_ZOOM_LERP;

      let smJcr = J_BASE_CR;
      let smJci = J_BASE_CI;
      let smPal = 0;
      const smColorI = 0.62;
      let spiralPhaseOut = 0;
      let viewAngle = 0;
      let effectiveZoom = JULIA_ZOOM;
      let barrelK = 0;
      const iterBase = Math.min(256, Math.max(32, Math.round(store.iters || maxIterBase)));
      let maxIter = iterBase;

      if (reduced) {
        smJcr = J_BASE_CR + 0.05;
        smJci = J_BASE_CI + 0.02;
      } else {
        const dn = scrollDriveNorm(store.depth, store.mode);
        const v = store.velocity;
        const zGain = Math.max(0, store.zoomRate) / ZOOM_RATE_BASE;
        const zoomish = dn * zGain;
        const iterT = Math.min(1, Math.max(0, zoomish));
        maxIter = Math.min(
          256,
          Math.max(32, Math.round(iterBase + iterT * (256 - iterBase) * 0.85)),
        );
        spiralPhaseOut = store.depth * 0.11 + v * 0.045 + store.spiralPhase + dn * 2.45 * zGain;
        smPal = dn * 4.8 * zGain + store.paletteOffset;
        smPal -= Math.floor(smPal);
        viewAngle = store.depth * 0.0036 + v * 0.0012 + dn * 0.048 * zGain;

        if (introT < 0.999) {
          effectiveZoom = zoomFrom + (JULIA_ZOOM - zoomFrom) * easeT;
          barrelK = 0.1 * (1.0 - easeT);
        } else {
          effectiveZoom = JULIA_ZOOM + dn * 0.38 * zGain;
          barrelK = dn * 0.022 * zGain;
        }
      }

      g.viewport(0, 0, canvas.width, canvas.height);
      g.clearColor(0, 0, 0, 1);
      g.clear(g.COLOR_BUFFER_BIT);
      g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, bufRef.current);
      g.enableVertexAttribArray(L.aPos);
      g.vertexAttribPointer(L.aPos, 2, g.FLOAT, false, 0, 0);

      if (L.uResolution) g.uniform2f(L.uResolution, canvas.width, canvas.height);
      if (L.uC) g.uniform2f(L.uC, smJcr, smJci);
      if (L.uZoom) g.uniform1f(L.uZoom, effectiveZoom);
      if (L.uMaxIter) g.uniform1f(L.uMaxIter, maxIter);
      if (L.uPaletteOffset) g.uniform1f(L.uPaletteOffset, smPal);
      if (L.uColorIntensity) g.uniform1f(L.uColorIntensity, smColorI);
      if (L.uSpiralPhase) g.uniform1f(L.uSpiralPhase, spiralPhaseOut);
      if (L.uViewAngle) g.uniform1f(L.uViewAngle, viewAngle);
      if (L.uBarrelK) g.uniform1f(L.uBarrelK, barrelK);
      if (L.uFractalMode) g.uniform1f(L.uFractalMode, 0);

      g.drawArrays(g.TRIANGLES, 0, 3);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    let resizeTO: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      dprRef.current = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      clearTimeout(resizeTO);
      resizeTO = setTimeout(setSize, 250);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTO);
      cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
      bufRef.current = null;
      programRef.current = null;
      glRef.current = null;
      locRef.current = null;
    };
  }, [reduced, maxIterBase, introTRef]);

  if (useCss) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen"
        style={{
          background: `
            radial-gradient(ellipse 55% 50% at 50% 50%, #000000 0%, #000000 42%, rgba(0,0,0,0) 58%),
            radial-gradient(ellipse 100% 95% at 50% 50%, rgba(30,8,50,0.35) 0%, #030208 100%)
          `,
          backgroundColor: '#020204',
        }}
        aria-hidden
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 block h-[100dvh] w-full"
      style={{ width: '100%', height: '100%', minHeight: '100dvh' }}
      aria-hidden
    />
  );
}
