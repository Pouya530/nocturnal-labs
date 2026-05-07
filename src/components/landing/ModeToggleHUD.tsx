'use client';

import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';

export function ModeToggleHUD(): ReactElement {
  const mode = useSyncExternalStore(
    tunnelStore.subscribe,
    () => tunnelStore.getState().mode,
    () => 'locked',
  );
  return (
    <button
      type="button"
      onClick={() => {
        const m = tunnelStore.getState().mode;
        tunnelStore.setState({ mode: m === 'locked' ? 'free' : 'locked' });
      }}
      className="fixed bottom-4 left-4 z-[120] rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
    >
      {mode === 'locked' ? 'Locked scroll' : 'Free fly'}
    </button>
  );
}
