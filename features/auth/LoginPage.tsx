import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, Database } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const navigate = useNavigate();

  // Clear any stale sessions when the login page mounts
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      // 1. Attempt Authentication (GoTrue)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) throw authError;
      
      if (data.user) {
        // 2. Attempt Profile Fetch (PostgREST)
        // We swallow errors here because the User IS authenticated.
        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            
            if (profileError) {
                console.warn("Profile fetch warning (non-fatal):", profileError);
            }
        } catch (profileEx) {
            console.warn("Profile fetch exception (non-fatal):", profileEx);
        }

        // 3. Success - Redirect
        navigate('/client'); 
      }

    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'An unexpected error occurred';
      
      // Detect the specific Schema Cache error
      if (msg.toLowerCase().includes('querying schema') || err.code === 'PGRST301') {
         setError(
            <div className="text-left w-full">
                <div className="flex items-center gap-2 font-bold text-red-800 mb-1">
                   <Database className="h-4 w-4" />
                   Database Sync Required
                </div>
                <p className="text-xs text-red-700 mb-2">
                   The database has new tables that the API cannot see yet.
                </p>
                <p className="text-xs font-semibold text-stone-700 mb-1">Action Required:</p>
                <p className="text-xs text-stone-600 mb-1">Run this SQL in Supabase:</p>
                <code className="block bg-white border border-red-200 p-2 rounded text-xs font-mono text-red-600 select-all cursor-pointer hover:bg-red-50" onClick={(e) => {
                   navigator.clipboard.writeText("NOTIFY pgrst, 'reload config';");
                   (e.target as HTMLElement).innerText = "Copied to clipboard!";
                   setTimeout(() => (e.target as HTMLElement).innerText = "NOTIFY pgrst, 'reload config';", 2000);
                }}>
                   NOTIFY pgrst, 'reload config';
                </code>
            </div>
         );
      } else if (msg.includes('Invalid login credentials')) {
         setError('Incorrect email or password. Please check and try again.');
      } else {
         setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    } catch (err: any) {
        setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded bg-saffron-500 flex items-center justify-center text-white font-bold text-2xl">
                G
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-stone-900">
                Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-stone-600">
                Or <Link to="/register" className="font-medium text-saffron-600 hover:text-saffron-500">create a new account</Link>
            </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 text-stone-900 ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 text-stone-900 ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                <div className="mt-0.5 shrink-0">
                  {typeof error !== 'string' ? null : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="flex-1">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
            >
              Sign in
            </Button>
          </div>
        </form>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-stone-500">Or continue with</span>
            </div>
        </div>

        <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleLogin}
        >
            Sign in with Google
        </Button>
        
        <div className="mt-4 text-center text-xs text-stone-400 bg-stone-50 p-3 rounded border border-stone-200">
           <p className="font-semibold mb-1">Demo Credentials (Click to Copy):</p>
           <div className="space-y-1 cursor-pointer" title="Click to use these credentials">
             <p onClick={() => { setEmail('admin@guruba.com'); setPassword('12345678'); }} className="hover:text-saffron-600 transition-colors">
                Role: Admin — admin@guruba.com
             </p>
             <p onClick={() => { setEmail('guru@guruba.com'); setPassword('12345678'); }} className="hover:text-saffron-600 transition-colors">
                Role: Guruba — guru@guruba.com
             </p>
             <p onClick={() => { setEmail('client@guruba.com'); setPassword('12345678'); }} className="hover:text-saffron-600 transition-colors">
                Role: Client — client@guruba.com
             </p>
           </div>
           <p className="mt-2 text-[10px] text-stone-300">Pass: 12345678</p>
        </div>
      </div>
    </div>
  );
};