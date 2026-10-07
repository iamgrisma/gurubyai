import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

const isWebBrowser = Platform.OS === 'web' && typeof window !== 'undefined';

const webStorage = {
  getItem: async (key: string) => {
    if (!isWebBrowser) return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (!isWebBrowser) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (!isWebBrowser) return;
    window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWebBrowser,
  },
});