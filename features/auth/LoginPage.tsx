// features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  
  // Clear any stale sessions when the login page mounts
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();

    const state = location.state as { email?: string; successMessage?: string } | null;
    if (state?.email) setEmail(state.email);
    if (state?.successMessage) setSuccessMessage(state.successMessage);
  }, [location]);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResend(false);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPass.trim(),
      });

      if (authError) throw authError;
      
      if (data.user) {
        // Fetch role to redirect correctly
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
        
        const role = profile?.role || 'client';
        if (role === 'admin') navigate('/admin');
        else if (role === 'guruba') navigate('/guruba');
        else navigate('/client'); 
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'An unexpected error occurred';
      
      if (msg.includes('Invalid login credentials')) {
         setError('Invalid credentials. Please check your email/password.');
      } else if (msg.includes('Email not confirmed')) {
         setError('Please verify your email address before logging in.');
         setShowResend(true);
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

  const handleResendVerification = async () => {
    try {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) throw error;
        setSuccessMessage('Verification email resent! Please check your inbox.');
        setShowResend(false);
    } catch (err: any) {
        setError(err.message || "Failed to resend verification email.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 px-4 py-12 sm:px-6 lg:px-8 animate-gradient-x">
      <div className="w-full max-w-md space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-saffron-500/30 transform -rotate-3">
                G
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900">
                Welcome Back
            </h2>
            <p className="mt-2 text-sm text-stone-500">
                Sign in to continue to Guruba Connect
            </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-lg shadow-sm bg-stone-800 p-1">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 bg-stone-800 py-3 text-white placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-500 sm:text-sm sm:leading-6 px-4 transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="h-px bg-stone-700 mx-4"></div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 bg-stone-800 py-3 text-white placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-500 sm:text-sm sm:leading-6 px-4 transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {successMessage && (
            <div className="flex items-start gap-3 text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-2">
                <div className="mt-0.5 shrink-0"><CheckCircle className="h-5 w-5" /></div>
                <div>{successMessage}</div>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                    <div className="flex-1 w-full overflow-hidden">{error}</div>
                </div>
                {showResend && (
                    <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} className="self-end mt-2 bg-white border-red-200 hover:bg-red-50 text-red-700">
                        <Mail className="h-3 w-3 mr-2" /> Resend Verification
                    </Button>
                )}
            </div>
          )}

          <Button type="submit" className="w-full bg-gradient-to-r from-saffron-600 to-orange-600 hover:from-saffron-700 hover:to-orange-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-saffron-500/25 transform transition-all active:scale-95" isLoading={loading}>
              Sign in
          </Button>
        </form>
        
        <div className="text-center">
            <Link to="/register" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                Don't have an account? Create one free
            </Link>
        </div>
      </div>
    </div>
  );
};