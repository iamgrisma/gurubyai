
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Notification } from '../../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Log stringified error to see the actual cause instead of [object Object]
        console.warn('Supabase error fetching notifications:', JSON.stringify(error));
        return;
      }
      
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error: any) {
      // Handle unexpected errors (network, etc) safely
      const errMsg = error?.message || JSON.stringify(error);
      console.error('Unexpected error fetching notifications:', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and user change
  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Simple polling every 60 seconds (increased to reduce load)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Failed to mark read:", error.message);
      // Silently fail or revert if needed, but usually acceptable to just log
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error: any) {
      console.error("Failed to mark all read:", error.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      refreshNotifications, 
      markAsRead,
      markAllAsRead
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
