"use client";

// features/notifications/NotificationContext.tsx

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Notification } from '../../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- Query: Fetch Notifications ---
  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 1000 * 30,   // Consider data fresh for 30 seconds
  });

  // --- Mutation: Mark Single Read ---
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previous = queryClient.getQueryData(['notifications', user?.id]);

      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        return old?.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n) || [];
      });

      return { previous };
    },
    onError: (err, _, context: any) => {
      queryClient.setQueryData(['notifications', user?.id], context.previous);
      console.error('Error marking notification as read:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // --- Mutation: Mark All Read ---
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onMutate: async () => {
      // Optimistic Update - mark all as read immediately in UI
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previous = queryClient.getQueryData(['notifications', user?.id]);

      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => {
        return old?.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })) || [];
      });

      return { previous };
    },
    onError: (err, _, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['notifications', user?.id], context.previous);
      console.error('Error marking all notifications as read:', err);
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead: (id) => markReadMutation.mutate(id),
      markAllAsRead: () => markAllReadMutation.mutate()
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};