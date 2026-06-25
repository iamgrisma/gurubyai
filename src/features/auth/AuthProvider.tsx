"use client";

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
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Profile via React Query
  // This automatically handles caching, refetching, and loading states
  const { data: profile, isLoading: profileLoading, refetch } = useProfile(user?.id);

  // Combined loading state
  const loading = authLoading || (!!user && profileLoading);

  const refreshProfile = async () => {
    await refetch();
  };

  const signOut = async () => {
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