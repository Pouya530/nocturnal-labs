'use client';

import type { MutableRefObject, ReactElement } from 'react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Capability, initCapability } from '@/core/capability';
import { motionPrefs } from '@/core/motion';
import { juliaFractalFrag, juliaFractalVertCover } from '@/visuals/shaders/juliaFractalShaderSources';

/* ─────────────────────────────────────────────────────────────────────────────
 * Cymatics Portal Julia — idle (non-audio) animation ported from `_engine_iife.js`.
 *
 * The original engine drives `c`, palette, and spiral phase from live audio analysis
 * (`fractalSmAudioLvl`, `Bf.bass`, transients, RMS, flux, …). On the landing there's no
 * audio, so we synthesise gentle idle drivers that keep the same perceptual character:
 * slow multi-octave orbit of `c` on a small disc around (-0.7269, 0.1889), a continuous
 * palette rotation, and an accumulating spiral phase. Exp-smoothing matches the engine.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Julia base c — the visually canonical Cymatics point. */
const J_BASE_CR = -0.7269;
const J_BASE_CI = 0.1889;

/** Engine's `juliaZoomFixed`. */
const JULIA_ZOOM = 0.48;

/** How much lower `uZoom` is at t=0 (wider FOV) before the portal intro eases in. */
const INTRO_ZOOM_LERP = 0.35;

const INTRO_T_DEFAULT: MutableRefObject<number> = { current: 1 };

function smoothstep3(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Max radius `(jcr, jci)` is allowed to drift from base (engine's `fractalJuliaDiscEffSm`). */
const J_DISC_RADIUS = 0.172;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[JuliaFractal] shader compile', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(
  gl: WebGLRenderingContext,
  vSrc: string,
  fSrc: string,
): WebGLProgram | null {
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
    console.error('[JuliaFractal] program link', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

/** Single triangle covering NDC; avoids diagonal seam of two-triangle quads. */
const COVER_TRI = new Float32Array([-1, -1, 3, -1, -1, 3]);

/** Exponential smoothing — matches engine `fractalExpSmooth`. */
function expSmooth(cur: number, target: number, dt: number, tau: number): number {
  if (!(tau > 0) || !isFinite(dt) || dt <= 0) return target;
  const a = 1 - Math.exp(-dt / tau);
  return cur + (target - cur) * a;
}

/**
 * Full-viewport Julia — **raw WebGL1** (no R3F/Three) so the canvas always gets real pixel dimensions
 * in Next + fixed layout. Shader + animation ported from the Cymatics Portal engine.
 *
 * `introTRef` 0 = portal intro start, 1 = settled; if omitted, defaults to 1 (no effect).
 */
export type JuliaFractalBackdropProps = {
  introTRef?: MutableRefObject<number>;
};

export function JuliaFractalBackdrop({
  introTRef: introTRefProp = INTRO_T_DEFAULT,
}: JuliaFractalBackdropProps): ReactElement {
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
    aPos: number;
  } | null>(null);
  const t0Ref = useRef(0);
  const tPrevRef = useRef(0);
  const dprRef = useRef(1);
  const bufRef = useRef<WebGLBuffer | null>(null);

  // Iteration ceiling — lighter on low-tier GPUs. Stays well within the shader's 256 bound.
  const maxIter = tier >= 3 ? 240 : tier >= 2 ? 200 : 150;

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
      console.warn('[JuliaFractal] no WebGL1 context; showing CSS fallback');
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

    t0Ref.current = performance.now();
    tPrevRef.current = 0;

    // Persistent animation state (per the engine's `fractalJulia*` globals).
    let orbitPh = 0;
    let orbitPh2 = 0;
    let spiralAccum = 0;
    let smJcr = J_BASE_CR;
    let smJci = J_BASE_CI;
    let smPal = 0;
    let smColorI = 0.62;
    let snapped = false;

    const setSize = () => {
      const d = dprRef.current;
      const w = Math.max(1, Math.floor(window.innerWidth * d));
      const h = Math.max(1, Math.floor(window.innerHeight * d));
      canvas.width = w;
      canvas.height = h;
    };

    setSize();

    const draw = (now: number) => {
      const g = glRef.current;
      const p = programRef.current;
      const L = locRef.current;
      if (!g || !p || !L) return;

      const tSec = (now - t0Ref.current) * 0.001;
      const dtRaw = tSec - tPrevRef.current;
      // Clamp dt so tab-switches don't produce a huge step that destabilises the exp-smoothers.
      const dt = Math.min(0.05, Math.max(1 / 240, dtRaw));
      tPrevRef.current = tSec;

      g.viewport(0, 0, canvas.width, canvas.height);
      g.clearColor(0, 0, 0, 1);
      g.clear(g.COLOR_BUFFER_BIT);
      g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, bufRef.current);
      g.enableVertexAttribArray(L.aPos);
      g.vertexAttribPointer(L.aPos, 2, g.FLOAT, false, 0, 0);

      let viewAngle = 0;

      if (reduced) {
        // Reduced-motion: freeze every animated piece of state. We still render each frame
        // so canvas resizes repaint correctly, but uniforms stay at their initial snapshot.
        if (!snapped) {
          smJcr = J_BASE_CR + 0.05;
          smJci = J_BASE_CI + 0.02;
          smColorI = 0.62;
          smPal = 0;
          spiralAccum = 0;
          snapped = true;
        }
      } else {
        // ── Synthetic "idle" drivers (stand-ins for audio) ────────────────────
        // All in [0,1]-ish ranges that mirror engine ranges; combined they give a
        // breath-like motion without ever feeling audio-reactive.
        const slowBreath = 0.5 + 0.5 * Math.sin(tSec * 0.09);   // level-like
        const midBreath = 0.5 + 0.5 * Math.sin(tSec * 0.133 + 1.1);
        const lvl = 0.38 + 0.16 * slowBreath;                  // "audio level"
        const rmsN = 0.22 + 0.12 * midBreath;                  // "rms"
        const fluxN = 0.18 + 0.10 * (0.5 + 0.5 * Math.sin(tSec * 0.21 + 0.7));
        const trJ = 0.08 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(tSec * 0.37), 2);
        const bandMid = 0.5 + 0.18 * Math.sin(tSec * 0.063 + 2.4);
        const bandLow = 0.5 + 0.18 * Math.sin(tSec * 0.057 + 0.3);
        const bandHigh = 0.5 + 0.18 * Math.sin(tSec * 0.081 + 4.2);

        // ── Orbit phases (engine lines ~1764-1784) ───────────────────────────
        orbitPh +=
          dt *
          (0.287 + lvl * 0.403 + rmsN * 0.558 + trJ * 0.232 + fluxN * 0.28 +
            bandMid * 0.202 + bandLow * 0.155);
        orbitPh2 +=
          dt *
          (0.229 + lvl * 0.357 + rmsN * 0.465 + trJ * 0.202 + fluxN * 0.22 +
            bandHigh * 0.093);

        // ── c-parameter orbit (engine lines ~1825-1850) ──────────────────────
        // hz01x (normalised log-hz) is fixed at 0.5 — mid-spectrum — since no audio.
        const hz01x = 0.5;
        const jOrbCr =
          0.065 * Math.sin(orbitPh) +
          0.057 * Math.cos(orbitPh * 0.74 + hz01x * 6.28318 * 0.45) +
          0.05 * Math.sin(orbitPh2 * 1.29 + hz01x * 6.28318 * 0.52) +
          0.042 * Math.cos(orbitPh * 0.42 - orbitPh2 * 0.91);
        const jOrbCi =
          0.062 * Math.cos(orbitPh * 0.89) +
          0.054 * Math.sin(orbitPh2 * 0.94 + hz01x * 6.28318 * 0.41) +
          0.047 * Math.cos(orbitPh * 1.08 + orbitPh2 * 0.57) +
          0.04 * Math.sin(orbitPh2 * 1.38);
        const rmsDrift = rmsN * 0.16 + trJ * 0.11;
        const jSlowRing =
          Math.sin(orbitPh * 1.08 + hz01x * 4.2 + rmsDrift * 1.8) *
          (0.024 + rmsDrift * 0.075);
        const jSlowRingI =
          Math.cos(orbitPh2 * 1.02 + hz01x * 3.95 + rmsDrift * 1.6) *
          (0.022 + rmsDrift * 0.07);

        // Target c with band + orbit drifts; clamp to disc around base.
        let jcrT = J_BASE_CR + jOrbCr + jSlowRing + (bandMid - 0.5) * 0.06;
        let jciT = J_BASE_CI + jOrbCi + jSlowRingI + (bandLow - 0.5) * 0.06;
        let jdx = jcrT - J_BASE_CR;
        let jdy = jciT - J_BASE_CI;
        let jD2 = jdx * jdx + jdy * jdy;
        if (jD2 > J_DISC_RADIUS * J_DISC_RADIUS) {
          const jS = J_DISC_RADIUS / Math.sqrt(jD2);
          jcrT = J_BASE_CR + jdx * jS;
          jciT = J_BASE_CI + jdy * jS;
        }

        if (!snapped) {
          smJcr = jcrT;
          smJci = jciT;
          snapped = true;
        } else {
          smJcr = expSmooth(smJcr, jcrT, dt, 0.155);
          smJci = expSmooth(smJci, jciT, dt, 0.155);
        }

        // Re-clamp after smoothing (engine safety check).
        jdx = smJcr - J_BASE_CR;
        jdy = smJci - J_BASE_CI;
        jD2 = jdx * jdx + jdy * jdy;
        if (jD2 > J_DISC_RADIUS * J_DISC_RADIUS) {
          const jS2 = J_DISC_RADIUS / Math.sqrt(jD2);
          smJcr = J_BASE_CR + jdx * jS2;
          smJci = J_BASE_CI + jdy * jS2;
        }

        // ── Spiral phase accumulator (engine lines ~1926-1954) ───────────────
        spiralAccum +=
          dt *
          (0.118 + lvl * 0.145 + rmsDrift * 0.14 + rmsN * 0.09 + fluxN * 0.11 +
            bandMid * 0.036 + bandLow * 0.026);

        // ── Palette rotation (engine lines ~1644-1650) ───────────────────────
        const palTarget = tSec * 0.24 + lvl * 0.12;
        smPal = expSmooth(smPal, palTarget, dt, 0.58);

        // ── Color intensity (engine lines ~1651-1654) ────────────────────────
        const colorITarget = 0.4 + lvl * 0.42 + bandMid * 0.14;
        smColorI = expSmooth(smColorI, colorITarget, dt, 0.15);

        // ── View angle — slow rotation (engine line 1741) ────────────────────
        viewAngle = tSec * 0.036;
      }

      // ── Upload uniforms — portal intro: uZoom lerp + uBarrelK (read ref each frame) ─
      const rawIntro = introTRef.current;
      const introT = Math.min(1, Math.max(0, rawIntro));
      const easeT = smoothstep3(introT);
      const zoomFrom = JULIA_ZOOM - INTRO_ZOOM_LERP;
      let effectiveZoom = JULIA_ZOOM;
      let barrelK = 0;
      if (reduced) {
        effectiveZoom = JULIA_ZOOM;
        barrelK = 0;
      } else if (introT < 0.999) {
        effectiveZoom = zoomFrom + (JULIA_ZOOM - zoomFrom) * easeT;
        barrelK = 0.1 * (1.0 - easeT);
      }

      if (L.uResolution) g.uniform2f(L.uResolution, canvas.width, canvas.height);
      if (L.uC) g.uniform2f(L.uC, smJcr, smJci);
      if (L.uZoom) g.uniform1f(L.uZoom, effectiveZoom);
      if (L.uMaxIter) g.uniform1f(L.uMaxIter, maxIter);
      if (L.uPaletteOffset) g.uniform1f(L.uPaletteOffset, smPal);
      if (L.uColorIntensity) g.uniform1f(L.uColorIntensity, smColorI);
      if (L.uSpiralPhase) g.uniform1f(L.uSpiralPhase, spiralAccum);
      if (L.uViewAngle) g.uniform1f(L.uViewAngle, viewAngle);
      if (L.uBarrelK) g.uniform1f(L.uBarrelK, barrelK);

      g.drawArrays(g.TRIANGLES, 0, 3);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      dprRef.current = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      setSize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
      bufRef.current = null;
      programRef.current = null;
      glRef.current = null;
      locRef.current = null;
    };
  }, [reduced, maxIter, introTRef]);

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
