'use client';

import type { ReactNode, ReactElement } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getActiveIntro, type IntroName } from '@/intros/introRegistry';

const Ctx = createContext<IntroName | null>(null);

/**
 * When non-null, {@link WormholePlanContent} swaps hero wrappers for `/wormhole5` intro sequences.
 */
export function WormholeLabIntroProvider({ children }: { children: ReactNode }): ReactElement {
  const [name, setName] = useState<IntroName>(() => getActiveIntro());

  const sync = useCallback(() => {
    setName(getActiveIntro());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('nl-active-intro-changed', sync);
    return () => window.removeEventListener('nl-active-intro-changed', sync);
  }, [sync]);

  return <Ctx.Provider value={name}>{children}</Ctx.Provider>;
}

export function useWormholeLabIntroName(): IntroName | null {
  return useContext(Ctx);
}
