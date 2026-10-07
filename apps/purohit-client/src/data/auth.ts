import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type AuthSession = Session | null;
