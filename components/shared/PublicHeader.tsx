import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Menu, X, User, LogOut } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-saffron-500 flex items-center justify-center text-white font-bold">
                G
              </div>
              <span className="text-xl font-bold text-stone-900">Guruba</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-stone-600 hover:text-saffron-600">
              Services
            </Link>
            <Link to="/gurubas" className="text-sm font-medium text-stone-600 hover:text-saffron-600">
              Find a Guruba
            </Link>
            <div className="flex items-center gap-2">
              {session ? (
                <div className="flex items-center gap-4">
                  <Link to={profile?.role === 'guruba' ? '/guruba' : '/client'}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Log In</Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white p-4">
          <div className="flex flex-col gap-4">
            <Link to="/" className="text-base font-medium" onClick={() => setIsMenuOpen(false)}>
              Services
            </Link>
            <Link to="/gurubas" className="text-base font-medium" onClick={() => setIsMenuOpen(false)}>
              Find a Guruba
            </Link>
            <div className="h-px bg-stone-200 my-2" />
            {session ? (
              <>
                 <Link to={profile?.role === 'guruba' ? '/guruba' : '/client'} onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full justify-start" variant="ghost">Dashboard</Button>
                 </Link>
                <Button variant="outline" className="w-full justify-start" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Log In</Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" className="w-full">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
