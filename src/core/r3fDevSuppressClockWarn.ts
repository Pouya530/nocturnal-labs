'use client';

/**
 * R3F still uses THREE.Clock; three@r184 logs a deprecation in dev. The hero logo Canvas
 * mounts before the lazy jellyfish chunk, so patch here and import this module before any `<Canvas>`.
 */
declare global {
  // eslint-disable-next-line no-var
  var __nlSuppressThreeClockWarn: boolean | undefined;
}

if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  !globalThis.__nlSuppressThreeClockWarn
) {
  globalThis.__nlSuppressThreeClockWarn = true;
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    const a0 = args[0];
    if (
      typeof a0 === 'string' &&
      a0.includes('THREE.Clock') &&
      a0.includes('THREE.Timer')
    ) {
      return;
    }
    warn.apply(console, args);
  };
}

export {};
