/**
 * Generates public/embeds/coin.html for WordPress (see WORDPRESS_COIN_EMBED.md).
 * Run: node scripts/gen-wp-coin-embed.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pngFrontPath = join(root, 'public/brand/updated-latin-motto.png');
const pngBackPath = join(root, 'public/brand/nocturnal-labs-logo-alt.png');
const outDir = join(root, 'public/embeds');
const outPath = join(outDir, 'coin.html');

const frontBuf = readFileSync(pngFrontPath);
const backBuf = readFileSync(pngBackPath);
const frontBytes = frontBuf.length;
const backBytes = backBuf.length;
const dataUriFront = 'data:image/png;base64,' + frontBuf.toString('base64');
const dataUriBack = 'data:image/png;base64,' + backBuf.toString('base64');

let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {
  /* */
}

const date = new Date().toISOString().split('T')[0];

/** From LogoCoin.tsx — CoinMesh (non-scroll hero); both faces match the app. */
const EXTRACTION = [
  'Front PNG: public/brand/updated-latin-motto.png',
  `Front size: ${(frontBytes / 1024).toFixed(1)} KB`,
  'Back PNG: public/brand/nocturnal-labs-logo-alt.png',
  `Back size: ${(backBytes / 1024).toFixed(1)} KB`,
  'Face UV: LOGO_TEXTURE_FACE_ZOOM 1.1, LOGO_TEXTURE_FACE_Y_NUDGE 0.018 (layoutFaceTexture)',
  'Coin radius (r): 1',
  'Coin thickness: 0.2',
  'Spin rate: 0.62 rad/s on Y (spin && !spinSyncScroll branch)',
  'Rim HSL (rimEmissiveOn): setHSL((t*0.11+hueSkew)%1, 0.42, 0.545) — embed uses hueSkew=0',
  'Rim emissive intensity: RIM_EMISSIVE_BASE*0.805 + sin(t*2.35)*RIM_EMISSIVE_WAVE*0.72',
  'RIM_EMISSIVE_BASE = 0.95 * 1.25 * 1.25 ≈ 1.484; RIM_EMISSIVE_WAVE = 0.38 * 1.25 * 1.25 ≈ 0.594',
  'Camera: [0, 0.08, 3.92] fov 33.5 near 0.1 far 24 (CAM_BASE_*)',
  'Face: metalness 0.125 roughness 0.205 color 0xffffff',
  'Rim cylinder: color #343942, open-ended, 72 seg; halo radial + 4.2s breathe',
];

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const htmlParts = [];

htmlParts.push(`<!--
  Nocturnal Labs spinning coin — WordPress embed
  Generated: ${date}
  Source commit: ${gitSha}
  Source: src/components/Hero/LogoCoin.tsx
  PNGs: public/brand/updated-latin-motto.png (front), public/brand/nocturnal-labs-logo-alt.png (back)

  How to paste: WordPress → block editor → Custom HTML → paste entire file → Preview (Administrator / unfiltered HTML).

  Regenerate: node scripts/gen-wp-coin-embed.mjs

  Extraction summary:
${EXTRACTION.map((l) => '  - ' + l).join('\n')}
-->`);

htmlParts.push(`<div class="ncl-coin-embed">`);
htmlParts.push(`<style>
.ncl-coin-embed {
  --holo-pink: #ff0080;
  --holo-purple: #c026d3;
  --holo-blue: #2563eb;
  --holo-green: #22c55e;
  --holo-yellow: #eab308;
  position: relative;
  width: min(100%, 600px);
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  max-width: 100%;
  min-width: 120px;
  box-sizing: border-box;
}
.ncl-coin-embed *,
.ncl-coin-embed *::before,
.ncl-coin-embed *::after {
  box-sizing: border-box;
}
@keyframes ncl-coin-halo-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.72;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.04);
    opacity: 0.92;
  }
}
.ncl-coin-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: 85%;
  height: 85%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 48%,
    transparent 18%,
    rgba(167, 139, 250, 0.12) 38%,
    rgba(56, 189, 248, 0.075) 54%,
    rgba(244, 114, 182, 0.055) 70%,
    rgba(77, 255, 176, 0.035) 82%,
    transparent 96%
  );
  filter: blur(24px);
  mix-blend-mode: screen;
  transform: translate(-50%, -50%);
  animation: ncl-coin-halo-breathe 4.2s ease-in-out infinite;
  animation-delay: 0.4s;
}
.ncl-coin-canvas-wrap {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.ncl-coin-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
.ncl-coin-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .ncl-coin-halo {
    animation: none;
    transform: translate(-50%, -50%) scale(1.02);
    opacity: 0.8;
  }
}
</style>`);
htmlParts.push(`<div class="ncl-coin-halo" aria-hidden="true"></div>`);
htmlParts.push(
  `<div class="ncl-coin-canvas-wrap"><canvas class="ncl-coin-canvas" aria-label="Nocturnal Labs 3D coin"></canvas><img class="ncl-coin-fallback" alt="" hidden /></div>`,
);

/** Module: direct import avoids duplicate importmap when multiple embeds pasted. */
htmlParts.push(`<script type="module">`);
htmlParts.push(String.raw`
const THREE_URL = '${THREE_CDN}';
const DATA_URI_FRONT = ${JSON.stringify(dataUriFront)};
const DATA_URI_BACK = ${JSON.stringify(dataUriBack)};

/** Matches LogoCoin layoutFaceTexture (zoom + vertical nudge). */
function layoutFaceTexture(tex, THREE, maxAniso) {
  const zoom = 1.1;
  const yNudge = 0.018;
  const invZ = 1 / zoom;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(16, maxAniso);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(invZ, invZ);
  tex.offset.set(0.5 * (1 - invZ), 0.5 * (1 - invZ) + yNudge);
  tex.needsUpdate = true;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function initOne(root) {
  if (root.dataset.nclInit === '1') return;
  root.dataset.nclInit = '1';

  const wrap = root.querySelector('.ncl-coin-canvas-wrap');
  const canvas = root.querySelector('.ncl-coin-canvas');
  const fallback = root.querySelector('.ncl-coin-fallback');
  if (!wrap || !canvas || !fallback) return;

  fallback.src = DATA_URI_FRONT;

  if (!hasWebGL()) {
    fallback.hidden = false;
    return;
  }

  const THREE = await import(THREE_URL);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const maxDpr = coarse ? 1.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

  const RIM_EMISSIVE_BASE = 0.95 * 1.25 * 1.25;
  const RIM_EMISSIVE_WAVE = 0.38 * 1.25 * 1.25;
  const SPIN = 0.62;
  const r = 1;
  const thickness = 0.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33.5, 1, 0.1, 24);
  camera.position.set(0, 0.08, 3.92);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const [texFront, texBack] = await Promise.all([
    loader.loadAsync(DATA_URI_FRONT),
    loader.loadAsync(DATA_URI_BACK),
  ]);
  layoutFaceTexture(texFront, THREE, maxAniso);
  layoutFaceTexture(texBack, THREE, maxAniso);

  const faceMatFront = new THREE.MeshStandardMaterial({
    map: texFront,
    color: 0xffffff,
    metalness: 0.125,
    roughness: 0.205,
    transparent: true,
    side: THREE.FrontSide,
  });

  const faceMatBack = new THREE.MeshStandardMaterial({
    map: texBack,
    color: 0xffffff,
    metalness: 0.125,
    roughness: 0.205,
    transparent: true,
    side: THREE.FrontSide,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x343942,
    metalness: 0.1425,
    roughness: 0.156,
    emissive: new THREE.Color('#9ca3b5'),
    emissiveIntensity: RIM_EMISSIVE_BASE * 0.805,
  });

  const coin = new THREE.Group();
  const spinGroup = new THREE.Group();
  const rimMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, thickness, 72, 1, true),
    rimMat,
  );
  rimMesh.rotation.x = Math.PI / 2;

  const front = new THREE.Mesh(new THREE.CircleGeometry(r, 72), faceMatFront);
  front.position.z = thickness / 2;
  const back = new THREE.Mesh(new THREE.CircleGeometry(r, 72), faceMatBack);
  back.position.z = -thickness / 2;
  back.rotation.y = Math.PI;

  spinGroup.add(rimMesh);
  spinGroup.add(front);
  spinGroup.add(back);
  coin.add(spinGroup);
  scene.add(coin);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.42);
  d1.position.set(3.2, 4, 5);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.42);
  d2.position.set(-3.2, 4, -5);
  scene.add(d2);
  const d3 = new THREE.DirectionalLight(0xa8b8ff, 0.3125);
  d3.position.set(-2, -1, 2);
  scene.add(d3);
  const pl = new THREE.PointLight(0xffffff, 0.2, 8);
  pl.position.set(0, 0, 1.35);
  scene.add(pl);

  let raf = 0;
  let running = false;
  const clock = new THREE.Clock();

  function resize() {
    const w = Math.max(1, wrap.clientWidth);
    const h = Math.max(1, wrap.clientHeight);
    const pr = Math.min(dpr, window.devicePixelRatio || dpr);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(wrap);

  function tick() {
    if (!running) return;
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    if (!reduced) {
      spinGroup.rotation.y += dt * SPIN;
      const hue = (t * 0.11) % 1;
      rimMat.emissive.setHSL(hue, 0.42, 0.545);
      rimMat.emissiveIntensity =
        RIM_EMISSIVE_BASE * 0.805 + Math.sin(t * 2.35) * (RIM_EMISSIVE_WAVE * 0.72);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(
    (entries) => {
      const vis = entries.some((e) => e.isIntersecting && e.intersectionRatio > 0);
      if (vis && !running) {
        running = true;
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      } else if (!vis && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    { threshold: [0, 0.01] },
  );
  io.observe(wrap);

  resize();

  function dispose() {
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    rimMesh.geometry.dispose();
    front.geometry.dispose();
    back.geometry.dispose();
    rimMat.dispose();
    faceMatFront.dispose();
    faceMatBack.dispose();
    texFront.dispose();
    texBack.dispose();
    renderer.dispose();
  }
  window.addEventListener('pagehide', dispose, { once: true });
}

async function boot() {
  const roots = document.querySelectorAll('.ncl-coin-embed');
  for (const root of roots) {
    await initOne(root);
  }
}

boot().catch(console.error);
`.trimEnd());

htmlParts.push(`</script>`);
htmlParts.push(`</div>`);

mkdirSync(outDir, { recursive: true });
const body = htmlParts.join('\n');
writeFileSync(outPath, body, 'utf8');

const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
console.log('Wrote', outPath);
console.log('HTML size:', kb, 'KB');
console.log('Base64 front prefix:', dataUriFront.slice(0, 72));
console.log('Base64 back prefix:', dataUriBack.slice(0, 72));
