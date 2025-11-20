import { createClient } from '@supabase/supabase-js';

// In a Vite project (standard for Cloudflare Pages), environment variables 
// are accessed via import.meta.env and must be prefixed with VITE_.
// We fallback to the hardcoded strings provided if environment variables are not set.

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://axctxzjqnxbloxakhhmx.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Y3R4empxbnhibG94YWtoaG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODYwNTQsImV4cCI6MjA3ODk2MjA1NH0.nZN3faVe4XiNot3Y2IiTTsprQPhPREfOb9D3Z6kU6-w';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.'
  );
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


