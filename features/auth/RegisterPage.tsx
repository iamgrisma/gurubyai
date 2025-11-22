// features/auth/RegisterPage.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, User, Mail, Lock, UserPlus, Briefcase } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'client' | 'guruba'>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Session exists = Auto Login (Email confirmation off)
      if (data.session) {
         const userRole = data.user?.user_metadata?.role || 'client';
         if (userRole === 'guruba') {
             // Navigate to Guruba dashboard with setup flag
             navigate('/guruba', { state: { showProfileSetup: true } });
         } else {
             navigate('/client');
         }
      } 
      // No session = Email confirmation required
      else if (data.user) {
        navigate('/login', { 
            state: { 
                email: email, 
                successMessage: "Account created successfully! Please check your email to confirm your address." 
            } 
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 px-4 py-12 sm:px-6 lg:px-8 animate-gradient-x">
      <div className="w-full max-w-md space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-saffron-500/30 transform -rotate-3">
                G
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-stone-900">
                Join Guruba Connect
            </h2>
            <p className="mt-2 text-sm text-stone-500">
                Start your spiritual journey today
            </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-stone-100 rounded-xl">
                <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                        role === 'client' 
                        ? 'bg-white text-saffron-600 shadow-md ring-1 ring-stone-200' 
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                    }`}
                >
                    <UserPlus className="h-4 w-4" /> I seek Services
                </button>
                <button
                    type="button"
                    onClick={() => setRole('guruba')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                        role === 'guruba' 
                        ? 'bg-white text-saffron-600 shadow-md ring-1 ring-stone-200' 
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                    }`}
                >
                    <Briefcase className="h-4 w-4" /> I am a Guruba
                </button>
            </div>

            <div>
              <label htmlFor="fullname" className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Full Name</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="block w-full rounded-lg border-stone-200 bg-stone-50 pl-10 py-3 text-stone-900 focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-500/20 transition-all"
                    placeholder="e.g. Arjun Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Email Address</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="block w-full rounded-lg border-stone-200 bg-stone-50 pl-10 py-3 text-stone-900 focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-500/20 transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    className="block w-full rounded-lg border-stone-200 bg-stone-50 pl-10 py-3 text-stone-900 focus:border-saffron-500 focus:bg-white focus:ring-2 focus:ring-saffron-500/20 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
              </div>
              <p className="mt-1 text-xs text-stone-400 ml-1">Must be at least 6 characters.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-saffron-600 to-orange-600 hover:from-saffron-700 hover:to-orange-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-saffron-500/25 transform transition-all active:scale-95"
            isLoading={loading}
          >
            Create Account
          </Button>
        </form>
        
        <div className="text-center mt-6">
            <p className="text-sm text-stone-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-saffron-600 hover:text-saffron-700 transition-colors hover:underline">
                    Sign in here
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};
