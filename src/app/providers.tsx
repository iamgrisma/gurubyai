"use client";

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { NotificationProvider } from '@/features/notifications/NotificationContext';
import { MessageProvider } from '@/components/ui/MessageContext';
import { CallProvider } from '@/features/video/CallProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Guruba PWA ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.error('Guruba PWA ServiceWorker registration failed:', err));
      });
    }
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <MessageProvider>
            <CallProvider>
              {children}
            </CallProvider>
          </MessageProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
