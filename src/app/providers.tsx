'use client';

import { ReactNode } from 'react';
import { StoreProvider } from '@/lib/store';
import { PlayerProvider } from '@/lib/player';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <PlayerProvider>
        {children}
      </PlayerProvider>
    </StoreProvider>
  );
}
