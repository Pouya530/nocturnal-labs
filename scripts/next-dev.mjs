/**
 * Ensures `NEXT_DIST_DEV=1` so `next.config.mjs` uses `.next-dev` (see repo comments).
 * IDE “Run dev server” often invokes `next dev` without npm scripts → MIME / 404 on `/_next/static`.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const nextCli = require.resolve('next/dist/bin/next');

const env = { ...process.env, NEXT_DIST_DEV: '1' };
const child = spawn(process.execPath, [nextCli, 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
