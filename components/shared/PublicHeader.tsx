// components/shared/PublicHeader.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { Button } from '../ui/Button';
import { Menu, X, User, LogOut, Coins, BookOpen, Users, Bell } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/login');
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 transition-all">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                G
              </div>
              <span className="text-xl font-bold text-stone-900 tracking-tight">Guruba</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
              Services
            </Link>
            <Link to="/gurubas" className="text-sm font-medium text-stone-600 hover:text-saffron-600 transition-colors">
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

                <NotificationBell />
                
                <Link to={getDashboardPath()}>
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
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-stone-600">Log In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="shadow-lg shadow-saffron-500/20">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-md"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md p-4 shadow-xl animate-in slide-in-from-top-5 absolute w-full">
          <div className="flex flex-col gap-2">
            <Link to="/" className="flex items-center gap-3 text-base font-medium text-stone-700 p-3 rounded-lg hover:bg-stone-50" onClick={() => setIsMenuOpen(false)}>
              <BookOpen className="h-5 w-5 text-stone-500" />
              <span>Services</span>
            </Link>
            <Link to="/gurubas" className="flex items-center gap-3 text-base font-medium text-stone-700 p-3 rounded-lg hover:bg-stone-50" onClick={() => setIsMenuOpen(false)}>
              <Users className="h-5 w-5 text-stone-500" />
              <span>Find a Guruba</span>
            </Link>
            
            <div className="h-px bg-stone-200 my-2" />
            
            {session ? (
              <div className="flex flex-col gap-2">
                 <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-bold text-stone-500 flex items-center gap-3"><Bell className="h-5 w-5 text-stone-500"/>Notifications</span>
                    <NotificationBell />
                 </div>
                 {isClient && (
                     <div className="flex items-center justify-between px-3 py-3 bg-stone-50 rounded-lg">
                         <span className="text-sm font-medium text-stone-600 flex items-center gap-3"><Coins className="h-5 w-5 text-stone-500"/>Your Balance</span>
                         <span className="font-bold text-saffron-600 flex items-center gap-1">{profile?.credits || 0}</span>
                     </div>
                 )}
                 <Link to={getDashboardPath()} onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full justify-start gap-3 p-3 h-auto text-base" variant="ghost">
                        <User className="h-5 w-5 text-stone-500" /> Dashboard
                    </Button>
                 </Link>
                <Button variant="outline" className="w-full justify-start gap-3 text-red-600 border-stone-200 hover:bg-red-50 p-3 h-auto text-base" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" /> Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full border border-stone-200 h-12 text-base">Log In</Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" className="w-full h-12 text-base">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};