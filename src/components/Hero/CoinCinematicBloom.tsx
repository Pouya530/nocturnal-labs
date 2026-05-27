'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  COIN_CINEMATIC_BLOOM_BASE,
  COIN_CINEMATIC_BLOOM_PEAK,
  COIN_CINEMATIC_BLOOM_RADIUS,
  COIN_CINEMATIC_BLOOM_THRESHOLD,
} from '@/lib/wormholeCoinCinematicSpinLighting';

type CoinCinematicBloomProps = {
  enabled: boolean;
  strengthRef: RefObject<number>;
};

/**
 * Replaces the default R3F render with bloom when cinematic coin lighting is active.
 */
export function CoinCinematicBloom({ enabled, strengthRef }: CoinCinematicBloomProps): null {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const origRenderRef = useRef<typeof gl.render | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      COIN_CINEMATIC_BLOOM_BASE,
      COIN_CINEMATIC_BLOOM_RADIUS,
      COIN_CINEMATIC_BLOOM_THRESHOLD,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomRef.current = bloom;

    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomRef.current = null;
    };
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    origRenderRef.current = gl.render.bind(gl);
    return () => {
      if (origRenderRef.current) {
        gl.render = origRenderRef.current;
        origRenderRef.current = null;
      }
    };
  }, [gl]);

  useEffect(() => {
    const composer = composerRef.current;
    const orig = origRenderRef.current;
    if (!composer || !orig) return;

    if (enabled) {
      gl.render = () => {
        const bloom = bloomRef.current;
        if (bloom) {
          bloom.strength =
            COIN_CINEMATIC_BLOOM_BASE + (strengthRef.current ?? 0) * COIN_CINEMATIC_BLOOM_PEAK;
        }
        composer.setSize(size.width, size.height);
        composer.render();
      };
    } else {
      gl.render = orig;
    }

    return () => {
      if (origRenderRef.current) gl.render = origRenderRef.current;
    };
  }, [enabled, gl, size.width, size.height, strengthRef]);

  useFrame(() => {
    if (!enabled) return;
    const bloom = bloomRef.current;
    if (bloom) {
      bloom.strength =
        COIN_CINEMATIC_BLOOM_BASE + (strengthRef.current ?? 0) * COIN_CINEMATIC_BLOOM_PEAK;
    }
  });

  return null;
}
