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
  const handleSignOut = async () => {
    await signOut();
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

              <Link href="/about" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                About Us
              </Link>
              <Link href="/faq" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
                FAQ
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

            {/* Mobile Actions (Visible only on mobile) */}
            <div className="md:hidden flex items-center gap-3">
              {session ? (
                 <NotificationBell />
              ) : (
                <Link href="/login">
                  <Button variant="primary" size="sm" className="shadow-lg shadow-saffron-500/20 text-xs py-1.5 h-8">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
