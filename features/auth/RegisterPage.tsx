import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, User, Mail, Lock } from 'lucide-react';

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

      // If session exists, they are auto-logged in (Email confirm is OFF)
      if (data.session) {
         const userRole = data.user?.user_metadata?.role || 'client';
         if (userRole === 'guruba') navigate('/guruba');
         else navigate('/client');
      } 
      // If only user exists, they are created but not logged in (Email confirm is ON)
      // We redirect to login immediately to let them try, treating verification as "optional" step in UI
      else if (data.user) {
        navigate('/login', { 
            state: { 
                email: email, 
                successMessage: "Account created successfully! You can now sign in." 
            } 
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
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
                Create an account
            </h2>
            <p className="mt-2 text-sm text-stone-600">
                Join Guruba Connect to start your spiritual journey.
            </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-stone-100 rounded-lg">
                <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        role === 'client' 
                        ? 'bg-white text-saffron-600 shadow-sm ring-1 ring-stone-200' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                >
                    I seek a Service
                </button>
                <button
                    type="button"
                    onClick={() => setRole('guruba')}
                    className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        role === 'guruba' 
                        ? 'bg-white text-saffron-600 shadow-sm ring-1 ring-stone-200' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                >
                    I am a Guruba
                </button>
            </div>

            <div>
              <label htmlFor="fullname" className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="block w-full rounded-md border-stone-300 pl-10 py-2 text-stone-900 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 sm:text-sm border"
                    placeholder="e.g. Arjun Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="block w-full rounded-md border-stone-300 pl-10 py-2 text-stone-900 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 sm:text-sm border"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    className="block w-full rounded-md border-stone-300 pl-10 py-2 text-stone-900 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 sm:text-sm border"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
              </div>
              <p className="mt-1 text-xs text-stone-500">Must be at least 6 characters.</p>
            </div>

          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
            >
              Sign Up
            </Button>
          </div>
        </form>
        
        <p className="text-center text-sm text-stone-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-saffron-600 hover:text-saffron-500">
                Sign in here
            </Link>
        </p>
      </div>
    </div>
  );
};