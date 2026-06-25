"use client";


// components/shared/PublicHeader.tsx

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter, usePathname, redirect } from "next/navigation";
import { useAuth } from '../../features/auth/AuthProvider';
import { NotificationBell } from '../messaging/NotificationBell';
import { Button } from '../ui/Button';
import { Menu, X, User, LogOut, Coins, BookOpen, Users, Bell, ChevronRight, MessageCircle } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    router.push('/login');
  };

  // Helper to determine dashboard path
  const getDashboardPath = () => {
    switch (profile?.role) {
      case 'admin': return '/admin';
      case 'guruba': return '/guruba';
      default: return '/client';
    }
  };

  const isClient = profile?.role === 'client';
  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'User';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 transition-all">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                  G
                </div>
                <span className="text-xl font-bold text-stone-900 tracking-tight">Guruba</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                Services
              </Link>
              <Link href="/gurubas" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                Find a Guruba
              </Link>

              <div className="h-6 w-px bg-stone-200 mx-2"></div>

              {session ? (
                <div className="flex items-center gap-4">
                  {/* Credit Balance (Client Only) */}
                  {isClient && (
                    <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100">
                      <Coins className="h-4 w-4 text-saffron-500" />
                      <span className="text-xs font-bold text-stone-700">{profile?.credits || 0} CR</span>
                    </div>
                  )}

                  <Link href="/messages">
                    <Button variant="ghost" size="sm" className="gap-2 hover:bg-stone-100">
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </Button>
                  </Link>

                  <NotificationBell />

                  <Link href={getDashboardPath()}>
                    <Button variant="ghost" size="sm" className="gap-2 hover:bg-stone-100">
                      <User className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="border-stone-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-stone-600">Log In</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm" className="shadow-lg shadow-saffron-500/20">Sign Up</Button>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold">
                  G
                </div>
                <span className="font-bold text-lg text-stone-900">Guruba</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Drawer Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8">

              {/* Main Navigation */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider px-2">Menu</p>
                <div className="space-y-1">
                  <Link href="/" className="flex items-center gap-4 p-3 rounded-xl text-stone-700 font-medium hover:bg-stone-50 active:bg-stone-100 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-base">Browse Services</span>
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </Link>
                  <Link href="/gurubas" className="flex items-center gap-4 p-3 rounded-xl text-stone-700 font-medium hover:bg-stone-50 active:bg-stone-100 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-base">Find a Guruba</span>
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </Link>
                </div>
              </div>

              {/* User Section */}
              {session ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider px-2">Account</p>

                  {/* Profile Card */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                        {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : displayName[0]}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-stone-900 truncate">{displayName}</p>
                        <p className="text-xs text-stone-500 truncate">{session.user.email}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={getDashboardPath()} className="flex-1">
                        <Button size="sm" className="w-full bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 shadow-sm">
                          Dashboard
                        </Button>
                      </Link>
                      <div className="flex-1 bg-white rounded-md border border-stone-200 flex items-center justify-center gap-1.5 text-sm font-medium text-stone-700 shadow-sm">
                        <Coins className="h-4 w-4 text-saffron-500" />
                        {profile?.credits || 0}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link href="/messages" className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-stone-400" />
                        <span className="text-stone-700 font-medium">Messages</span>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-stone-400" />
                        <span className="text-stone-700 font-medium">Notifications</span>
                      </div>
                      <NotificationBell />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-saffron-50 rounded-2xl border border-saffron-100">
                    <h4 className="font-bold text-saffron-800 mb-1">Join Guruba Connect</h4>
                    <p className="text-sm text-saffron-600 mb-4">Sign in to book rituals and manage your appointments.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/login">
                        <Button variant="outline" className="w-full bg-white border-saffron-200 text-saffron-700 hover:bg-saffron-50">Log In</Button>
                      </Link>
                      <Link href="/register">
                        <Button className="w-full bg-saffron-600 hover:bg-saffron-700 text-white shadow-md shadow-saffron-200">Sign Up</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {session && (
              <div className="p-5 border-t border-stone-100 bg-stone-50">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
