// features/auth/AuthProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';
import { useProfile } from '../../hooks/queries';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginWithFallback: (email: string, role: 'client' | 'guruba' | 'admin') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Handle Session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ignore updates if we are in a mock session
      if (user?.id.startsWith('mock-')) return;

      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  // 2. Fetch Profile via React Query
  // This automatically handles caching, refetching, and loading states
  const { data: profile, isLoading: profileLoading, refetch } = useProfile(user?.id);

  // Combined loading state
  const loading = authLoading || (!!user && profileLoading);

  const refreshProfile = async () => {
    await refetch();
  };

  const loginWithFallback = async (email: string, role: 'client' | 'guruba' | 'admin') => {
    const mockId = 'mock-user-' + role;
    
    // Create a fake User object
    const mockUser: User = {
      id: mockId,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: email,
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    } as User;

    // Create a fake Session object
    const mockSession: Session = {
      access_token: 'mock-token-' + Date.now(),
      refresh_token: 'mock-refresh-' + Date.now(),
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Create a fake Profile
    const mockProfile: UserProfile = {
      id: mockId,
      email: email,
      full_name: role === 'client' ? 'Demo Client' : role === 'guruba' ? 'Pandit Demo Ji' : 'System Administrator',
      role: role,
      phone: '555-0000',
      gotra_id: role === 'guruba' ? 'Bharadwaj' : 'Kashyap',
      avatar_url: role === 'guruba' ? 'https://ui-avatars.com/api/?name=Pandit+Ji&background=f57c00&color=fff' : undefined,
      credits: 100, // Default credits for mock user
      city: 'Kathmandu'
    };

    // Manually seed the React Query cache
    queryClient.setQueryData(['profile', mockId], mockProfile);

    setSession(mockSession);
    setUser(mockUser);
    setAuthLoading(false);
  };

  const signOut = async () => {
    // If it's a mock user, just clear state
    if (user?.id.startsWith('mock-')) {
        setSession(null);
        setUser(null);
        queryClient.removeQueries(); // Clear cache
        return;
    }
    
    await supabase.auth.signOut();
    queryClient.removeQueries(); // Clear cache on sign out
  };

  return (
    <AuthContext.Provider value={{ 
        session, 
        user, 
        profile: profile || null, // Ensure undefined becomes null for consistency
        loading, 
        signOut, 
        loginWithFallback, 
        refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}