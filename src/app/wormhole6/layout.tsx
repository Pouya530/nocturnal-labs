import type { ReactNode } from 'react';

/** Pass-through only; `/wormhole6` redirects to `/` (see `page.tsx`). */
export default function Wormhole6Layout({ children }: { children: ReactNode }) {
  return children;
}
