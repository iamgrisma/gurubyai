import { createClient } from '@supabase/supabase-js';

// In a Next.js project, environment variables 
// are accessed via process.env and prefixed with NEXT_PUBLIC_.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


