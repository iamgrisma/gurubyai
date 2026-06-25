"use client";

// features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter, usePathname, useSearchParams, redirect } from "next/navigation";
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle, Mail, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname(); 
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();

    const emailParam = searchParams.get('email');
    const successMsgParam = searchParams.get('successMessage');
    if (emailParam) setEmail(emailParam);
    if (successMsgParam) setSuccessMessage(successMsgParam);
  }, [searchParams]);

  const checkUserRoleAndRedirect = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        
        const from = searchParams.get('from');
        if (from) {
            router.push(from);
            return;
        }

        const role = profile?.role || 'client';
        if (role === 'admin') router.push('/admin');
        else if (role === 'guruba') router.push('/guruba');
        else router.push('/client'); 
  };

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
        await checkUserRoleAndRedirect(data.user.id);
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

  const handleMagicLinkLogin = async () => {
      if (!email) {
          setError("Please enter your email address first.");
          return;
      }
      setMagicLinkLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
          const { error } = await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: {
                  shouldCreateUser: false,
                  emailRedirectTo: window.location.origin
              }
          });
          if (error) throw error;
          setSuccessMessage("Magic Link sent! Check your email to log in instantly.");
      } catch (err: any) {
          setError(err.message || "Failed to send Magic Link. Note: Magic Links may be rate limited.");
      } finally {
          setMagicLinkLoading(false);
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
                required={!magicLinkLoading} // Not required if doing magic link
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

          <div className="space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-saffron-600 to-orange-600 hover:from-saffron-700 hover:to-orange-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-saffron-500/25 transform transition-all active:scale-95" isLoading={loading}>
                Sign in
            </Button>
            
            <div className="relative flex items-center justify-center text-sm">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
                <span className="relative bg-white px-2 text-stone-500">OR</span>
            </div>

            <Button 
                type="button" 
                variant="outline" 
                className="w-full border-stone-300 hover:bg-stone-50 text-stone-700"
                onClick={handleMagicLinkLogin}
                isLoading={magicLinkLoading}
            >
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                Email me a one-time login link
            </Button>
          </div>
        </form>
        
        <div className="text-center">
            <Link href="/register" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                Don't have an account? Create one free
            </Link>
        </div>
      </div>
    </div>
  );
};
