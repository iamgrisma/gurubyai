import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';

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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        // Only clear if we are not in a fallback mode (checking if session is null is enough usually)
        // But if we manually set a fallback session, we don't want this listener to clear it immediately
        // unless it's an explicit sign out. For now, we let standard behavior rule.
        // If we use loginWithFallback, we might need to unsubscribe or ignore this.
        // However, for simplicity, we assume loginWithFallback is used when Supabase is broken
        // so this listener likely won't fire 'SIGNED_IN' events anyway.
        
        // If we successfully logged in via fallback, we don't want to clear it here
        // We rely on the fact that fallback login won't trigger this event.
        if (!user?.id.startsWith('mock-')) {
           setSession(null);
           setUser(null);
           setProfile(null);
           setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (userId.startsWith('mock-')) return; // Don't fetch for mock users

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile from Supabase:', error.message);
      } 
      
      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
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
      avatar_url: role === 'guruba' ? 'https://ui-avatars.com/api/?name=Pandit+Ji&background=f57c00&color=fff' : undefined
    };

    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setLoading(false);
  };

  const signOut = async () => {
    // If it's a mock user, just clear state
    if (user?.id.startsWith('mock-')) {
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, loginWithFallback, refreshProfile }}>
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