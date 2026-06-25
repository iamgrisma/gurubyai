"use client";

// features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter, usePathname, useSearchParams, redirect } from "next/navigation";
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle, Mail, Sparkles, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const router = useRouter();
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Premium Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-saffron-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />

      <div className="w-full max-w-md space-y-8 glass-panel p-10 rounded-3xl relative z-10 animate-in fade-in slide-in-from-top-5">
        <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-saffron-500/30 transform -rotate-6 mb-6">
                G
            </div>
            <h2 className="mt-4 text-3xl font-outfit font-bold tracking-tight text-stone-900">
                Welcome Back
            </h2>
            <p className="mt-2 text-sm text-stone-500">
                Sign in to continue your spiritual journey
            </p>
        </div>

        <form className="space-y-6 mt-8" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-stone-700 mb-1">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-stone-200 bg-white/50 py-3 text-stone-900 placeholder:text-stone-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-500 focus:bg-white sm:text-sm sm:leading-6 px-4 transition-all outline-none shadow-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required={!magicLinkLoading} 
                className="block w-full rounded-xl border border-stone-200 bg-white/50 py-3 text-stone-900 placeholder:text-stone-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-saffron-500 focus:bg-white sm:text-sm sm:leading-6 px-4 transition-all outline-none shadow-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {successMessage && (
            <div className="flex items-start gap-3 text-green-800 text-sm bg-green-50/80 backdrop-blur p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                <div className="mt-0.5 shrink-0"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div className="font-medium">{successMessage}</div>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-3 text-red-800 text-sm bg-red-50/80 backdrop-blur p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                    <div className="flex-1 w-full overflow-hidden font-medium">{error}</div>
                </div>
                {showResend && (
                    <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} className="self-end bg-white border-red-200 hover:bg-red-50 text-red-700">
                        <Mail className="h-4 w-4 mr-2" /> Resend Verification
                    </Button>
                )}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Button type="submit" className="w-full group bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 rounded-xl shadow-lg shadow-stone-900/10 transition-all active:scale-95 flex items-center justify-center gap-2" isLoading={loading}>
                Sign in with Password <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="relative flex items-center justify-center text-sm py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
                <span className="relative bg-[#fafaf9] px-4 text-stone-500 text-xs font-medium uppercase tracking-wider">or continue with</span>
            </div>

            <Button 
                type="button" 
                variant="outline" 
                className="w-full border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium py-3 rounded-xl shadow-sm transition-all active:scale-95"
                onClick={handleMagicLinkLogin}
                isLoading={magicLinkLoading}
            >
                <Sparkles className="h-4 w-4 mr-2 text-saffron-500" />
                Send Magic Link
            </Button>
          </div>
        </form>
        
        <div className="text-center pt-4">
            <Link href="/register" className="text-sm font-medium text-stone-500 hover:text-saffron-600 transition-colors">
                Don't have an account? <span className="font-bold underline decoration-saffron-300 underline-offset-4">Create one free</span>
            </Link>
        </div>
      </div>
    </div>
  );
};
