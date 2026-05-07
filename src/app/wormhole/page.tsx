'use client';

import { WormholeRoute } from '@/components/wormhole/WormholeRoute';

/** Client page: shell already lazy-loads Three; avoids server `dynamic` + dev chunk edge cases. */
export default function WormholePlanPage() {
  return <WormholeRoute />;
}
