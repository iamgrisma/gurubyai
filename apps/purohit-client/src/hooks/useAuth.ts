import { useEffect, useState } from 'react';
import { supabase } from '../data/supabase';
import type { AuthSession } from '../data/auth';

export function useAuth() {
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  return { session, loading };
}
