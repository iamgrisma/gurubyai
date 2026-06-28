"use client";

// features/client/ClientDashboard.tsx

import React, { useState, useEffect } from 'react';

import { useRouter, redirect, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { ReviewModal } from './ReviewModal';
import { ChatInterface } from '../messages/ChatInterface';
import { useBookings, useProfile } from '../../hooks/queries';
import {
  Calendar, CreditCard, User, LogOut, Menu, X, RefreshCw, LayoutDashboard, MessageSquare,
  ChevronsLeft, ChevronsRight, Search, Shield
} from 'lucide-react';
import { DashboardOverview } from './dashboard/Overview';
import { DashboardBookings } from './dashboard/Bookings';
import { DashboardWallet } from './dashboard/Wallet';
import { DashboardProfile } from './dashboard/Profile';

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, isCollapsed }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center py-3 text-sm font-medium transition-all duration-200 rounded-xl mb-1 group ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      } ${active ? 'bg-saffron-50 text-saffron-700 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
      }`}
    title={isCollapsed ? label : ''}
  >
    <div className={`flex items-center gap-3 ${isCollapsed ? 'transform transition-transform group-hover:scale-110' : ''}`}>
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-saffron-600' : 'text-stone-400'}`} />
      {!isCollapsed && <span className="flex-1 text-left">{label}</span>}
    </div>
    {!isCollapsed && badge && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>}
  </button>
);


type ActiveTab = 'overview' | 'bookings' | 'messages' | 'wallet' | 'profile';

export const ClientDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam) {
      const allowedTabs: ActiveTab[] = ['overview', 'bookings', 'messages', 'wallet', 'profile'];
      if (allowedTabs.includes(tabParam as any)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [tabParam]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [reviewModalData, setReviewModalData] = useState<{ id: string, gurubaId: string, gurubaName: string } | null>(null);

  // --- Queries ---
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: bookingsData = [], isLoading: bookingsLoading } = useBookings(user?.id, 'client');
  const { data: myReviews = [] } = useQuery({
    queryKey: ['myReviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('reviews').select('booking_id').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  const reviewedBookingIds = new Set(myReviews.map(r => r.booking_id));
  const bookings = bookingsData.map(b => ({
    ...b,
    is_reviewed: reviewedBookingIds.has(b.id)
  }));

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const handleBookingNegotiation = async (bookingId: string, action: 'accept' | 'decline', proposedTime?: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (action === 'accept') {
        if (!proposedTime) return;
        await supabase.from('bookings').update({
          status: 'confirmed',
          scheduled_at: proposedTime
        }).eq('id', bookingId);

        if (booking?.gurubas?.user_id) {
          await supabase.from('messages').insert([{
            sender_id: user?.id,
            receiver_id: booking.gurubas.user_id,
            content: "I have confirmed the proposed time. Looking forward to our session!",
            booking_id: bookingId
          }]);
        }
      } else {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
        
        if (booking?.gurubas?.user_id) {
          await supabase.from('messages').insert([{
            sender_id: user?.id,
            receiver_id: booking.gurubas.user_id,
            content: "I have declined the proposed time.",
            booking_id: bookingId
          }]);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (e) {
      alert("Action failed");
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const loading = profileLoading || bookingsLoading;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview user={user} profile={profile || null} bookings={bookings} setActiveTab={setActiveTab} handleBookingNegotiation={handleBookingNegotiation} />;
      case 'bookings':
        return <DashboardBookings bookings={bookings} setReviewModalData={setReviewModalData} />;
      case 'messages':
        return (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Messages</h2>
            <ChatInterface />
          </div>
        );
      case 'wallet':
        return <DashboardWallet profile={profile || null} />;
      case 'profile':
        return <DashboardProfile user={user} profile={profile || null} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-stone-200 flex flex-col
        transition-transform lg:transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16
        ${isMobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full w-72'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
      `}>
        <div className={`p-6 border-b border-stone-100 ${isSidebarCollapsed ? 'lg:p-2' : ''}`}>
          <div className="flex justify-between items-center lg:hidden mb-4">
            <span className="font-bold text-lg text-stone-900">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-stone-100">
              <X className="h-6 w-6 text-stone-500" />
            </button>
          </div>
          <div className={`flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 transition-all ${isSidebarCollapsed ? 'lg:justify-center lg:p-0 lg:py-4 lg:bg-transparent lg:border-none' : ''}`}>
            <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold shadow-md overflow-hidden shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : displayName[0]}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="font-bold text-stone-900 truncate text-sm">{displayName}</p>
                <p className="text-xs text-stone-500 truncate font-medium">Credits: {profile?.credits || 0}</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Search} label="Find a Guruba" active={false} onClick={() => router.push('/book')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Calendar} label="Bookings" active={activeTab === 'bookings'} onClick={() => handleTabChange('bookings')} badge={bookings.filter(b => b.status === 'confirmed').length || null} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={CreditCard} label="Wallet" active={activeTab === 'wallet'} onClick={() => handleTabChange('wallet')} isCollapsed={isSidebarCollapsed} />
          {!isSidebarCollapsed && <div className="my-4 h-px bg-stone-100 mx-2" />}
          <SidebarItem icon={User} label="My Profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} isCollapsed={isSidebarCollapsed} />
          {profile?.role === 'admin' && (
            <SidebarItem icon={Shield} label="Admin Panel" active={false} onClick={() => router.push('/admin')} isCollapsed={isSidebarCollapsed} />
          )}
        </nav>
        <div className={`p-6 border-t border-stone-100 ${isSidebarCollapsed ? 'lg:p-2' : ''}`}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-3 text-sm font-medium text-stone-500 hover:bg-stone-100 rounded-xl transition-colors mb-2"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <button onClick={() => signOut().then(() => router.push('/'))} className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
            <LogOut className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="lg:hidden mb-6 flex items-center gap-4">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200 text-stone-600">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-stone-900 text-lg capitalize">{activeTab}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full text-saffron-600">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          renderContent()
        )}
      </main>

      {reviewModalData && (
        <ReviewModal
          bookingId={reviewModalData.id}
          gurubaId={reviewModalData.gurubaId}
          gurubaName={reviewModalData.gurubaName}
          onClose={() => setReviewModalData(null)}
          onSuccess={() => {
            setReviewModalData(null);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['myReviews'] });
          }}
        />
      )}
    </div>
  );
};
