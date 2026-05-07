'use client';

import { useEffect, useRef } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * `/wormhole3` — keep `wormholeCoinVisible` false until scroll depth reaches the zoom cap, then
 * latch visible so zooming back out still shows the coin (same as `/wormhole` after reveal).
 */
export function Wormhole3CoinReveal(): null {
  const revealed = useRef(false);

  useEffect(() => {
    const tryReveal = () => {
      if (revealed.current) return;
      const s = tunnelStore.getState();
      const max = Math.max(1, s.maxDepth);
      if (s.depth / max >= 0.9992) {
        revealed.current = true;
        tunnelStore.setState({ wormholeCoinVisible: true });
      }
    };

    tryReveal();
    const unsub = tunnelStore.subscribe(tryReveal);
    return () => {
      unsub();
    };
  }, []);

  return null;
}
