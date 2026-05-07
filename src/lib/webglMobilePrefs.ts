/**
 * On phones / coarse pointers, `high-performance` can prevent a WebGL context on some GPUs.
 * `default` lets the browser pick a working config.
 */
export function webglPowerPreference(): 'default' | 'high-performance' {
  if (typeof window === 'undefined') return 'high-performance';
  return window.matchMedia('(pointer: coarse)').matches ? 'default' : 'high-performance';
}
