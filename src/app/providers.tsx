"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { NotificationProvider } from '@/features/notifications/NotificationContext';
import { MessageProvider } from '@/components/ui/MessageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
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
            {children}
          </MessageProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
