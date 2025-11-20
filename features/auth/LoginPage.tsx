import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Clear any stale sessions when the login page mounts
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();

    // Check for incoming state from registration
    const state = location.state as { email?: string; successMessage?: string } | null;
    if (state?.email) setEmail(state.email);
    if (state?.successMessage) setSuccessMessage(state.successMessage);
  }, [location]);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = loginEmail.trim();
      const cleanPassword = loginPass.trim();

      // 1. Attempt Authentication (GoTrue)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) throw authError;
      
      if (data.user) {
        // 2. Attempt Profile Fetch (PostgREST)
        let userRole = 'client';
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            
            if (profileError) throw profileError;
            if (profileData) {
                userRole = profileData.role;
            }
        } catch (profileEx: any) {
            console.warn("Profile fetch failed:", profileEx);
        }

        // 3. Success - Redirect based on role
        if (userRole === 'admin') navigate('/admin');
        else if (userRole === 'guruba') navigate('/guruba');
        else navigate('/client'); 
      }

    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'An unexpected error occurred';
      
      if (msg.includes('Invalid login credentials')) {
         setError('Account not found or invalid credentials. Please Sign Up if you do not have an account.');
      } else if (msg.includes('leaked password')) {
         setError('Security Alert: The password you entered has been found in a data leak. Please reset your password.');
      } else if (msg.includes('Email not confirmed')) {
         setError('Please verify your email address before logging in.');
      } else {
         setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
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

          {successMessage && (
            <div className="flex items-start gap-3 text-green-700 text-sm bg-green-50 p-3 rounded border border-green-200">
                <div className="mt-0.5 shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>{successMessage}</div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                <div className="mt-0.5 shrink-0">
                  {typeof error !== 'string' ? null : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="flex-1 w-full overflow-hidden">{error}</div>
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
                <div className="w-full border-t border-stone-300" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-stone-500">Don't have an account?</span>
            </div>
        </div>
        
        <Link to="/register">
            <Button variant="outline" className="w-full">
                Create Account
            </Button>
        </Link>
      </div>
    </div>
  );
};