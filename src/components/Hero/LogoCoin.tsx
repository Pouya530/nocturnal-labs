'use client';

import '@/core/r3fDevSuppressClockWarn';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import type { ReactElement } from 'react';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/** Place assets in `public/brand/` (front: Latin motto, back: alternate wordmark) */
const FACE_SRC_FRONT = '/brand/updated-latin-motto.png';
const FACE_SRC_BACK = '/brand/nocturnal-labs-logo-alt.png';

/**
 * Slight UV zoom (center crop) so the art inside the coin face extends closer to
 * the edge and the black ring in the bitmap reads as a thinner border.
 */
const LOGO_TEXTURE_FACE_ZOOM = 1.1;

/** Map × color; includes prior boosts, +25% vs last pass. */
const LOGO_FACE_BRIGHTNESS = 1.3 * 1.25;
const LOGO_FACE_COLOR = new THREE.Color(
  LOGO_FACE_BRIGHTNESS,
  LOGO_FACE_BRIGHTNESS,
  LOGO_FACE_BRIGHTNESS,
);

/** Tighter highlights / rim response; +25% vs last pass. */
const SHINE = 1.25 * 1.25;
const FACE_METALNESS = 0.08 * SHINE;
const FACE_ROUGHNESS = 0.32 / SHINE;
const RIM_METALNESS = 0.55 * SHINE;
const RIM_ROUGHNESS = 0.38 / SHINE;
const RIM_EMISSIVE_BASE = 0.95 * SHINE;
const RIM_EMISSIVE_WAVE = 0.38 * SHINE;

type CoinMeshProps = {
  spin: boolean;
};

function layoutFaceTexture(tex: THREE.Texture) {
  const z = LOGO_TEXTURE_FACE_ZOOM;
  const invZ = 1 / z;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  if (z > 1) {
    tex.repeat.set(invZ, invZ);
    tex.offset.set(0.5 * (1 - invZ), 0.5 * (1 - invZ));
  } else {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }
  tex.needsUpdate = true;
}

function resetFaceTextureLayout(tex: THREE.Texture) {
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  tex.needsUpdate = true;
}

function CoinMesh({ spin }: CoinMeshProps): ReactElement {
  const group = useRef<THREE.Group>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const [frontTex, backTex] = useTexture([FACE_SRC_FRONT, FACE_SRC_BACK]) as [THREE.Texture, THREE.Texture];

  const faceMaterialFront = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LOGO_FACE_COLOR.clone(),
        transparent: true,
        metalness: FACE_METALNESS,
        roughness: FACE_ROUGHNESS,
        side: THREE.FrontSide,
      }),
    [],
  );

  const faceMaterialBack = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LOGO_FACE_COLOR.clone(),
        transparent: true,
        metalness: FACE_METALNESS,
        roughness: FACE_ROUGHNESS,
        side: THREE.FrontSide,
      }),
    [],
  );

  useLayoutEffect(() => {
    layoutFaceTexture(frontTex);
    layoutFaceTexture(backTex);
    faceMaterialFront.map = frontTex;
    faceMaterialFront.needsUpdate = true;
    faceMaterialBack.map = backTex;
    faceMaterialBack.needsUpdate = true;
    return () => {
      resetFaceTextureLayout(frontTex);
      resetFaceTextureLayout(backTex);
    };
  }, [frontTex, backTex, faceMaterialFront, faceMaterialBack]);

  useFrame((state, delta) => {
    if (spin && group.current) {
      group.current.rotation.y += delta * 0.62;
    }
    const t = state.clock.elapsedTime;
    const m = rimMat.current;
    if (m) {
      m.emissive.setHSL((t * 0.11) % 1, 0.94, 0.52);
      m.emissiveIntensity = RIM_EMISSIVE_BASE + Math.sin(t * 2.35) * RIM_EMISSIVE_WAVE;
    }
  });

  const r = 1;
  const thickness = 0.2;

  return (
    <group ref={group}>
      <ambientLight intensity={0.6} />
      {/* Matched front/back keys so both faces get the same lighting as the coin spins. */}
      <directionalLight position={[3.2, 4, 5]} intensity={0.42} />
      <directionalLight position={[-3.2, 4, -5]} intensity={0.42} />
      <directionalLight position={[-2, -1, 2]} intensity={0.3125} color="#a8b8ff" />
      <pointLight position={[0, 0, 1.35]} intensity={0.2} distance={8} />
      <pointLight position={[0, 0, -1.35]} intensity={0.2} distance={8} />

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, thickness, 72, 1, true]} />
        <meshStandardMaterial
          ref={rimMat}
          color="#07070c"
          metalness={RIM_METALNESS}
          roughness={RIM_ROUGHNESS}
          emissive="#8e3bff"
          emissiveIntensity={RIM_EMISSIVE_BASE}
        />
      </mesh>

      <mesh position={[0, 0, thickness / 2]} material={faceMaterialFront}>
        <circleGeometry args={[r, 72]} />
      </mesh>
      <mesh position={[0, 0, -thickness / 2]} rotation={[0, Math.PI, 0]} material={faceMaterialBack}>
        <circleGeometry args={[r, 72]} />
      </mesh>
    </group>
  );
}

export type LogoCoinCanvasProps = {
  /** When false, coin stays static (reduced motion). */
  spin: boolean;
};

/**
 * 3D coin: front / back face PNGs, iridescent emissive rim, Y-axis spin.
 */
export function LogoCoinCanvas({ spin }: LogoCoinCanvasProps): ReactElement {
  return (
    <Canvas
      className="logo-coin-canvas-root block h-full w-full min-h-0 touch-none overflow-visible leading-none"
      resize={{ scroll: true, debounce: 0, offsetSize: true }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NoToneMapping;
      }}
      camera={{ position: [0, 0.08, 3.92], fov: 33.5, near: 0.1, far: 24 }}
    >
      <Suspense fallback={null}>
        <CoinMesh spin={spin} />
      </Suspense>
    </Canvas>
  );
}
