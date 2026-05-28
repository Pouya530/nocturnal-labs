/** Remove Next dev/build output dirs (`.next`, `.next-dev`). */
import { rmSync } from 'node:fs';

for (const dir of ['.next', '.next-dev']) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code !== 'ENOENT') throw e;
  }
}
