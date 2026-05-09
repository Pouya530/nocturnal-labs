'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { motionPrefs } from '@/core/motion';
import { wormholeNarrowViewport } from '@/lib/webglMobilePrefs';
import {
  cosmicFragment,
  cosmicPointFragment,
  cosmicPointVertex,
  cosmicVertex,
} from '@/visuals/shaders/cosmicShaderSources';
import { tunnelStore } from '@/tunnel/tunnelStore';

/** Match {@link JuliaWormholeBackdrop} narrow-viewport bloom strength feel on phones. */
const COSMIC_MOBILE_BLOOM_STRENGTH_MUL = 1.1;

const PALETTE = [
  new THREE.Color('#ff4da8'),
  new THREE.Color('#8e3bff'),
  new THREE.Color('#3b7bff'),
  new THREE.Color('#4dffb0'),
  new THREE.Color('#f5ff61'),
];

export function CosmicBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initial = tunnelStore.getState();
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer:coarse)').matches &&
      window.matchMedia('(hover:none)').matches;

    const PARTICLE_COUNT = isMobile ? 1000 : 3000;
    const STAR_COUNT = isMobile ? 800 : 1500;
    const RAYMARCH_STEPS = isMobile ? 16 : 24;
    const JULIA_ITERS = isMobile ? 16 : 32;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      zIndex: '0',
    });

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030208, initial.fogDensity);
    const camera = new THREE.PerspectiveCamera(
      80,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      500,
    );
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -10);

    const cloudMat = new THREE.ShaderMaterial({
      vertexShader: cosmicVertex,
      fragmentShader: cosmicFragment,
      transparent: false,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
        uDepth: { value: 0 },
        uVelocity: { value: 0 },
        uJuliaC: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
        uJuliaZoom: { value: initial.cosmicJuliaZoom },
        uJuliaBlend: { value: initial.cosmicJuliaBlend },
        uPaletteOffset: { value: initial.paletteOffset },
        uCoreIntensity: { value: initial.cosmicCoreIntensity },
        uCloudDensity: { value: initial.cosmicCloudDensity },
        uRaymarchSteps: { value: RAYMARCH_STEPS },
        uJuliaIters: { value: JULIA_ITERS },
        uReducedMotion: { value: 0 },
      },
    });
    const cloudGeo = new THREE.PlaneGeometry(2, 2);
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.frustumCulled = false;
    const cloudScene = new THREE.Scene();
    cloudScene.add(cloudMesh);
    const cloudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const streamBoost = isMobile ? 7.4 : 11.2;
    const streamClamp = isMobile ? 54 : 82;
    /** Distant shell ~200+ units: larger boost + min pixel size so discs stay visible (fog scale separate). */
    const starBoost = isMobile ? 4.2 : 6.4;
    const starClamp = isMobile ? 56 : 78;
    const starMinPx = isMobile ? 1.35 : 2.1;

    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pCol = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const z = -Math.random() * 200;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = z;
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      pCol[i * 3] = tint.r;
      pCol[i * 3 + 1] = tint.g;
      pCol[i * 3 + 2] = tint.b;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('cosmicVertexColor', new THREE.BufferAttribute(pCol, 3));
    const streamMat = new THREE.ShaderMaterial({
      vertexShader: cosmicPointVertex,
      fragmentShader: cosmicPointFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexColors: false,
      uniforms: {
        uFogDensity: { value: initial.fogDensity },
        uFogDistanceScale: { value: 1.0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uSizeBoost: { value: streamBoost },
        uSizeClamp: { value: streamClamp },
        uMinPointPx: { value: 0 },
        uLuminosity: { value: 1.0 },
      },
    });
    const particles = new THREE.Points(pGeo, streamMat);
    scene.add(particles);

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 200 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      starCol[i * 3] = tint.r;
      starCol[i * 3 + 1] = tint.g;
      starCol[i * 3 + 2] = tint.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('cosmicVertexColor', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: cosmicPointVertex,
      fragmentShader: cosmicPointFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexColors: false,
      uniforms: {
        uFogDensity: { value: initial.fogDensity },
        uFogDistanceScale: { value: 0.055 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uSizeBoost: { value: starBoost },
        uSizeClamp: { value: starClamp },
        uMinPointPx: { value: starMinPx },
        uLuminosity: { value: isMobile ? 1.22 : 1.38 },
      },
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    composer.setSize(window.innerWidth, window.innerHeight);
    const scenePass = new RenderPass(scene, camera);
    scenePass.clear = false;
    composer.addPass(scenePass);
    const narrow0 = wormholeNarrowViewport();
    const mobileBloomMul0 = narrow0 ? COSMIC_MOBILE_BLOOM_STRENGTH_MUL : 1;
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      initial.bloomStrength * mobileBloomMul0,
      initial.bloomRadius,
      initial.bloomThreshold,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    let resizePending = false;
    const onResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        bloom.setSize(w, h);
        cloudMat.uniforms.uResolution.value.set(w, h);
        const pr = renderer.getPixelRatio();
        streamMat.uniforms.uPixelRatio.value = pr;
        starMat.uniforms.uPixelRatio.value = pr;
        resizePending = false;
      });
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let randCamPulse = 0;
    let randCamLastDepth = 0;
    let randCamTx = 0;
    let randCamTy = 0;
    let randCamRx = 0;
    let randCamRy = 0;

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const s = tunnelStore.getState();

      cloudMat.uniforms.uTime.value = reduced ? 0 : time;
      cloudMat.uniforms.uDepth.value = s.depth;
      cloudMat.uniforms.uVelocity.value = s.velocity;
      cloudMat.uniforms.uJuliaC.value.set(s.juliaCx, s.juliaCy);
      cloudMat.uniforms.uPaletteOffset.value = s.paletteOffset;
      cloudMat.uniforms.uReducedMotion.value = reduced ? 1 : 0;
      cloudMat.uniforms.uJuliaBlend.value = s.wormholeHelixJuliaRibbonShaderEnabled
        ? s.cosmicJuliaBlend
        : 0;
      cloudMat.uniforms.uCloudDensity.value = s.cosmicCloudDensity;
      cloudMat.uniforms.uCoreIntensity.value = s.cosmicCoreIntensity;
      cloudMat.uniforms.uJuliaZoom.value = s.cosmicJuliaZoom;

      const narrow = wormholeNarrowViewport();
      const mobileBloomMul = narrow ? COSMIC_MOBILE_BLOOM_STRENGTH_MUL : 1;
      bloom.strength = s.bloomStrength * mobileBloomMul;
      bloom.radius = s.bloomRadius;
      bloom.threshold = s.bloomThreshold;

      particles.visible = s.wormholeHelices3dEnabled;

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = s.fogDensity;
      }
      streamMat.uniforms.uFogDensity.value = s.fogDensity;
      starMat.uniforms.uFogDensity.value = s.fogDensity;
      const prNow = renderer.getPixelRatio();
      streamMat.uniforms.uPixelRatio.value = prNow;
      starMat.uniforms.uPixelRatio.value = prNow;

      const mpReduced = motionPrefs.reduced;
      if (!mpReduced) {
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
        camera.lookAt(0, 0, -10);
        const randTilt = s.wormholeDebugRandomCamTilt;
        if (randTilt) {
          randCamPulse += dt;
          const scrolling =
            Math.abs(s.velocity) > 0.032 || Math.abs(s.depth - randCamLastDepth) > 5.5;
          randCamLastDepth = s.depth;
          if (scrolling && randCamPulse > 0.34) {
            randCamPulse = 0;
            randCamTx = (Math.random() - 0.5) * 0.44;
            randCamTy = (Math.random() - 0.5) * 0.38;
          }
          randCamRx += (randCamTx - randCamRx) * (1 - Math.exp(-dt * 4.2));
          randCamRy += (randCamTy - randCamRy) * (1 - Math.exp(-dt * 4.2));
          camera.rotateX(randCamRx);
          camera.rotateY(randCamRy);
        } else {
          randCamTx = 0;
          randCamTy = 0;
          randCamRx += (0 - randCamRx) * (1 - Math.exp(-dt * 6));
          randCamRy += (0 - randCamRy) * (1 - Math.exp(-dt * 6));
        }
        if (s.wormholeDebugCircularCamTilt) {
          const ph = time * 0.26;
          camera.rotateX(Math.cos(ph) * 0.013);
          camera.rotateY(Math.sin(ph) * 0.011);
        }
      } else {
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
        camera.lookAt(0, 0, -10);
        randCamTx = 0;
        randCamTy = 0;
        randCamRx = 0;
        randCamRy = 0;
        randCamPulse = 0;
        randCamLastDepth = s.depth;
      }

      const positions = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const r = Math.sqrt(x * x + y * y);
        const swirlSpeed = reduced ? 0 : 0.4 / Math.max(r, 0.5);
        const angle = Math.atan2(y, x) + swirlSpeed * dt;
        positions[i * 3] = Math.cos(angle) * r * 0.998;
        positions[i * 3 + 1] = Math.sin(angle) * r * 0.998;
        positions[i * 3 + 2] += s.velocity * dt * 12;
        if (positions[i * 3 + 2] > 5 || r < 0.4) {
          const newR = 4 + Math.random() * 6;
          const newTheta = Math.random() * Math.PI * 2;
          positions[i * 3] = Math.cos(newTheta) * newR;
          positions[i * 3 + 1] = Math.sin(newTheta) * newR;
          positions[i * 3 + 2] = -200;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      if (!reduced) {
        stars.rotation.z = time * 0.00055;
      }

      renderer.setRenderTarget(composer.readBuffer);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, true);
      renderer.render(cloudScene, cloudCam);

      composer.render(dt);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      bloom.dispose();
      composer.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      pGeo.dispose();
      streamMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full bg-[#030208]"
      aria-hidden
    />
  );
}
