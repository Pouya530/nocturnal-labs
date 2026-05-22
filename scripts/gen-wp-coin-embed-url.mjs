/**
 * Generates public/embeds/coin-external.html — WordPress coin embed with
 * textures loaded from HTTPS URLs (CORS). See WORDPRESS_COIN_EMBED.md.
 *
 * Usage:
 *   node scripts/gen-wp-coin-embed-url.mjs <front-url> <back-url>
 *   COIN_FRONT_URL=... COIN_BACK_URL=... node scripts/gen-wp-coin-embed-url.mjs
 *
 * Environment variables override CLI arguments when both are set.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/embeds');
const outPath = join(outDir, 'coin-external.html');

/** STEP 1 sanity: same assets as LogoCoin.tsx / gen-wp-coin-embed.mjs (not read at runtime here). */
const EXPECT_FRONT = join(root, 'public/brand/updated-latin-motto.png');
const EXPECT_BACK = join(root, 'public/brand/nocturnal-labs-logo-alt.png');
if (!existsSync(EXPECT_FRONT) || !existsSync(EXPECT_BACK)) {
  console.error(
    '[gen-wp-coin-embed-url] Expected repo PNGs missing:\n' +
      `  front: ${EXPECT_FRONT} ${existsSync(EXPECT_FRONT) ? 'OK' : 'MISSING'}\n` +
      `  back:  ${EXPECT_BACK} ${existsSync(EXPECT_BACK) ? 'OK' : 'MISSING'}\n` +
      'LogoCoin.tsx uses /brand/updated-latin-motto.png and /brand/nocturnal-labs-logo-alt.png — fix paths before relying on this generator.',
  );
  process.exit(1);
}

function pickUrls() {
  const ef = process.env.COIN_FRONT_URL?.trim();
  const eb = process.env.COIN_BACK_URL?.trim();
  if (ef && eb) return { front: ef, back: eb };
  const a = process.argv.slice(2);
  if (a.length >= 2) return { front: a[0].trim(), back: a[1].trim() };
  if (ef || eb) {
    console.error('Provide both COIN_FRONT_URL and COIN_BACK_URL, or two CLI arguments.');
    process.exit(1);
  }
  console.error(
    'Usage:\n' +
      '  node scripts/gen-wp-coin-embed-url.mjs <front-url> <back-url>\n' +
      '  COIN_FRONT_URL=... COIN_BACK_URL=... node scripts/gen-wp-coin-embed-url.mjs',
  );
  process.exit(1);
}

/** Path before ? must end with .ext or /ext (e.g. placehold.co/.../png). */
function endsWithImageExt(u) {
  const base = u.split('?')[0].replace(/\/+$/, '');
  return /\.(png|jpg|jpeg|webp)$/i.test(base) || /\/(png|jpg|jpeg|webp)$/i.test(base);
}

function validateUrl(label, u) {
  if (!u) {
    console.error(`Missing ${label} URL.`);
    process.exit(1);
  }
  if (u.startsWith('http://')) {
    console.warn(
      `[gen-wp-coin-embed-url] ${label} uses http:// — OK for local dev only; production should use https://`,
    );
  } else if (!u.startsWith('https://')) {
    console.error(
      `${label} URL must start with https:// (http:// allowed with warning for dev only). Got: ${u.slice(0, 48)}...`,
    );
    process.exit(1);
  }
  try {
    void new URL(u);
    if (!endsWithImageExt(u)) {
      console.error(
        `${label} URL must end with .png, .jpg, .jpeg, or .webp (or path ending in /png, etc., before ?query).`,
      );
      process.exit(1);
    }
  } catch {
    console.error(`${label} URL is not a valid URL: ${u.slice(0, 80)}`);
    process.exit(1);
  }
}

const { front: frontUrl, back: backUrl } = pickUrls();
validateUrl('Front', frontUrl);
validateUrl('Back', backUrl);

let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {
  /* */
}
const date = new Date().toISOString().split('T')[0];

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const serverConfigComment = `
  REQUIRED SERVER CONFIG — CORS for WebGL textures (cross-origin)
  ----------------------------------------------------------------
  For WebGL to upload images from a different origin as textures, the image
  server must include a CORS header on PNG/JPG/WebP responses, for example:

    Access-Control-Allow-Origin: *

  Or restrict to your WordPress origin:

    Access-Control-Allow-Origin: https://your-wp-site.com

  How to set this depends on the host:
  - Vercel: add a \`headers\` entry in vercel.json for the image path pattern.
  - Netlify: use a _headers file with the path and header.
  - Nginx: \`add_header Access-Control-Allow-Origin *;\` (or a specific origin)
    inside the \`location\` that serves static images.
  - Apache / .htaccess: e.g. \`Header set Access-Control-Allow-Origin "*"\` inside
    a <FilesMatch "\\.(png|jpg|jpeg|webp)$"> block.

  Without this, <img> may still show (fallback) but WebGL textures stay blank.

  Regenerate this file:
    COIN_FRONT_URL=<url> COIN_BACK_URL=<url> npm run gen:wp-coin-url
    # or: npm run gen:wp-coin-url -- <front-url> <back-url>
`.trim();

function escapeHtmlAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const htmlParts = [];

htmlParts.push(`<!--
  Nocturnal Labs spinning coin — WordPress embed (external texture URLs)
  Generated: ${date}
  Source commit: ${gitSha}
  Source scene: scripts/gen-wp-coin-embed.mjs (same as LogoCoin.tsx)

  Front image URL: ${frontUrl}
  Back image URL:  ${backUrl}

  ${serverConfigComment.split('\n').join('\n  ')}

  How to paste: WordPress → Custom HTML block → paste entire file → Preview.
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
  pointer-events: none;
}
.ncl-coin-fallback--back {
  z-index: 1;
}
.ncl-coin-fallback--front {
  z-index: 2;
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
  `<div class="ncl-coin-canvas-wrap">` +
    `<canvas class="ncl-coin-canvas" aria-label="Nocturnal Labs 3D coin"></canvas>` +
    `<img class="ncl-coin-fallback ncl-coin-fallback--back" src="${escapeHtmlAttr(backUrl)}" crossorigin="anonymous" alt="Nocturnal Labs coin (back)" hidden />` +
    `<img class="ncl-coin-fallback ncl-coin-fallback--front" src="${escapeHtmlAttr(frontUrl)}" crossorigin="anonymous" alt="Nocturnal Labs coin (front)" hidden />` +
    `</div>`,
);

htmlParts.push(`<script type="module">`);
htmlParts.push(`
const THREE_URL = ${JSON.stringify(THREE_CDN)};
const FRONT_URL = ${JSON.stringify(frontUrl)};
const BACK_URL = ${JSON.stringify(backUrl)};

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

function showFallbacks(fbFront, fbBack, frontOnly) {
  if (fbFront) fbFront.hidden = false;
  if (!frontOnly && fbBack) fbBack.hidden = false;
}

async function initOne(root) {
  if (root.dataset.nclInit === '1') return;
  root.dataset.nclInit = '1';

  const wrap = root.querySelector('.ncl-coin-canvas-wrap');
  const canvas = root.querySelector('.ncl-coin-canvas');
  const fbFront = root.querySelector('.ncl-coin-fallback--front');
  const fbBack = root.querySelector('.ncl-coin-fallback--back');
  if (!wrap || !canvas || !fbFront) return;

  if (!hasWebGL()) {
    canvas.style.display = 'none';
    showFallbacks(fbFront, fbBack, true);
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
  loader.setCrossOrigin('anonymous');

  let texFront;
  let texBack;
  try {
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    texFront = await loader.loadAsync(FRONT_URL);
    texBack = await loader.loadAsync(BACK_URL);
    layoutFaceTexture(texFront, THREE, maxAniso);
    layoutFaceTexture(texBack, THREE, maxAniso);
  } catch (e) {
    console.warn(
      '[ncl-coin] Texture load failed. Likely cause: the image server is not sending Access-Control-Allow-Origin headers. ' +
        'See server config notes in coin-external.html source comment.',
      e,
    );
    canvas.style.display = 'none';
    showFallbacks(fbFront, fbBack, true);
    renderer.dispose();
    return;
  }

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
`.trim());
htmlParts.push(`</script>`);
htmlParts.push(`</div>`);

mkdirSync(outDir, { recursive: true });
const body = htmlParts.join('\n');
writeFileSync(outPath, body, 'utf8');

const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
console.log('Wrote', outPath);
console.log('HTML size:', kb, 'KB');
console.log('Front URL:', frontUrl);
console.log('Back URL:', backUrl);
console.log('');
console.log('Verify CORS: curl -I <each-image-url>  and check for access-control-allow-origin.');
console.log('Reminder: the image host must send Access-Control-Allow-Origin for WebGL textures to work cross-origin.');
