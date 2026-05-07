'use client';

import type { ReactElement } from 'react';

import { DebugTunnelPanel } from '@/components/landing/DebugTunnelPanel';
import { ModeToggleHUD } from '@/components/landing/ModeToggleHUD';
import { useScrollDepth, type ScrollDepthOptions } from '@/hooks/useScrollDepth';

export type LocalTunnelChromeProps = {
  showWormholeControls?: boolean;
  scrollOptions?: ScrollDepthOptions;
  /** When false, hides bottom-left locked/free toggle (default true). */
  showModeToggle?: boolean;
  /** When false, hides tunnel debug panel (default true). */
  showDebugPanel?: boolean;
};

/** Wires scroll depth + optional HUD. */
export function LocalTunnelChrome(props: LocalTunnelChromeProps): ReactElement {
  const {
    showWormholeControls = false,
    scrollOptions,
    showModeToggle = true,
    showDebugPanel = true,
  } = props;
  useScrollDepth(true, scrollOptions);
  return (
    <>
      {showModeToggle ? <ModeToggleHUD /> : null}
      {showDebugPanel ? <DebugTunnelPanel showWormholeControls={showWormholeControls} /> : null}
    </>
  );
}
