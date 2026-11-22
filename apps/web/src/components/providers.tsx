'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './ui/sonner';
import { QueryErrorHandler } from './query-error-handler';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <QueryErrorHandler />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
