/**
 * Idle-time prefetch for hero WebGL coin (reduces ENTER / post-preloader main-thread spikes).
 */

let logoCoinPrefetchStarted = false;

export function prefetchLogoCoinCanvas(): void {
  if (logoCoinPrefetchStarted || typeof window === 'undefined') return;
  logoCoinPrefetchStarted = true;
  void import('@/components/Hero/LogoCoin');
}
