import { createClient } from '@supabase/supabase-js';

// In a Vite project (standard for Cloudflare Pages), environment variables 
// are accessed via import.meta.env and must be prefixed with VITE_.
// We fallback to the hardcoded strings provided if environment variables are not set.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


