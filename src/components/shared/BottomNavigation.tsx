"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/AuthProvider';
import { Home, Search, Calendar, MessageCircle, User } from 'lucide-react';
import { useNotifications } from '../../features/notifications/NotificationContext';

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname();
  const { session, profile } = useAuth();
  const { unreadCount } = useNotifications();

  // Hide on desktop
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-stone-200/50 safe-area-pb">
      <nav className="flex justify-around items-center px-2 py-2">
        <NavItem href="/" icon={Home} label="Home" active={pathname === '/'} />
        <NavItem href="/gurubas" icon={Search} label="Search" active={pathname === '/gurubas'} />
        
        {session ? (
          <>
            <NavItem 
              href={profile?.role === 'guruba' ? '/guruba?tab=bookings' : '/client?tab=bookings'} 
              icon={Calendar} 
              label="Bookings" 
              active={pathname.includes('tab=bookings')} 
            />
            <NavItem 
              href={profile?.role === 'admin' ? '/admin' : profile?.role === 'guruba' ? '/guruba?tab=messages' : '/client?tab=messages'} 
              icon={MessageCircle} 
              label="Messages" 
              active={pathname.includes('tab=messages')}
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <NavItem 
              href={profile?.role === 'admin' ? '/admin' : profile?.role === 'guruba' ? '/guruba' : '/client'} 
              icon={User} 
              label="Profile" 
              active={['/client', '/guruba', '/admin'].includes(pathname) && !pathname.includes('tab=')} 
            />
          </>
        ) : (
          <NavItem href="/login" icon={User} label="Login" active={pathname === '/login'} />
        )}
      </nav>
    </div>
  );
};

const NavItem = ({ href, icon: Icon, label, active, badge }: any) => {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-full py-1 group">
      <div className={`relative flex items-center justify-center h-8 w-16 rounded-full transition-all duration-300 ${active ? 'bg-saffron-100 text-saffron-700 scale-110' : 'text-stone-500 group-hover:text-stone-900 group-hover:bg-stone-100'}`}>
        <Icon className={`h-5 w-5 ${active ? 'fill-saffron-200' : ''}`} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-1 font-medium transition-colors ${active ? 'text-saffron-700 font-bold' : 'text-stone-500 group-hover:text-stone-900'}`}>
        {label}
      </span>
    </Link>
  );
};
