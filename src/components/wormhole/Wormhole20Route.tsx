'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { WormholePlanContent } from '@/components/wormhole/WormholePlanContent';
import { Wormhole20ClientShell } from '@/components/wormhole/Wormhole20ClientShell';
import { isLocalhostHostname } from '@/lib/isLocalhost';

/**
 * `/wormhole20` — wormhole5 lab + ambient sync + FFT equalizer. Dev-only (redirects to `/wormhole5` off localhost).
 */
export function Wormhole20Route(): ReactElement {
  const router = useRouter();
  const [devOk, setDevOk] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLocalhostHostname(window.location.hostname)) {
      router.replace('/wormhole5');
      return;
    }
    setDevOk(true);
  }, [router]);

  if (!devOk) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030208] text-sm text-zinc-500">
        Wormhole 20 is dev-only…
      </div>
    );
  }

  return (
    <Wormhole20ClientShell>
      <WormholePlanContent />
    </Wormhole20ClientShell>
  );
}
