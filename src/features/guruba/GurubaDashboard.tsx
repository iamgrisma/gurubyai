"use client";

// features/guruba/GurubaDashboard.tsx

import React, { useState } from 'react';

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Guruba } from '../../types';
import { ChatInterface } from '../messages/ChatInterface';
import { useBookings, useUpdateBookingStatus } from '../../hooks/queries';
import {
    Calendar, LayoutDashboard, ListChecks, User, LogOut, MessageSquare,
    Briefcase, Users, BookOpen, Menu, X, ChevronsLeft, ChevronsRight,
    RefreshCw, Shield
} from 'lucide-react';

// Child Components
import { GurubaOverview } from './dashboard/Overview';
import { GurubaRequests } from './dashboard/Requests';
import { GurubaSchedule } from './dashboard/Schedule';
import { GurubaServices } from './dashboard/Services';
import { GurubaClients } from './dashboard/Clients';
import { GurubaProfile } from './dashboard/Profile';
import { GurubaResources } from './dashboard/Resources';

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

export const GurubaDashboard: React.FC = () => {
    const { profile, user, signOut } = useAuth();
    const queryClient = useQueryClient();
    const pathname = usePathname(); 
    const searchParams = useSearchParams();
    const router = useRouter();

    // Check if we should default to profile tab (e.g. after new registration)
    const shouldShowSetup = searchParams.get('showProfileSetup') === 'true';
    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'messages' | 'schedule' | 'services' | 'clients' | 'resources' | 'profile'>(shouldShowSetup ? 'profile' : 'overview');

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // --- Queries ---

    // 1. Fetch Current Guruba Profile
    const { data: guruba, isLoading: gurubaLoading } = useQuery({
        queryKey: ['gurubaProfile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase.from('gurubas').select('*, profiles:user_id(*)').eq('user_id', user.id).single();
            return data as Guruba;
        },
        enabled: !!user?.id
    });

    // 2. Fetch Bookings
    const { data: bookings = [], isLoading: bookingsLoading } = useBookings(user?.id, 'guruba');

    // --- Mutations ---
    const updateStatusMutation = useUpdateBookingStatus();

    const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled' | 'completed') => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const updatePayload: any = { id: bookingId, status: action };
        if (action === 'confirmed' && !booking.scheduled_at && booking.proposed_time) {
            updatePayload.scheduled_at = booking.proposed_time;
        }

        updateStatusMutation.mutate(updatePayload);
    };

    const handleAddLink = async (id: string, link: string) => {
        if (!link.startsWith('http') && !link.startsWith('wa.me')) {
            alert("Please enter a valid URL (starting with http://, https://, or wa.me/)");
            return;
        }
        updateStatusMutation.mutate({ id: id, status: 'confirmed', meeting_link: link }, {
            onSuccess: () => {
                alert("Meeting link updated!");
            }
        });
    };

    // Derived Data
    const pendingCount = bookings.filter(b => b.status === 'pending').length;

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    const loading = gurubaLoading || bookingsLoading;
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <GurubaOverview
                        guruba={guruba || null}
                        bookings={bookings}
                        setActiveTab={setActiveTab}
                        handleBookingAction={handleBookingAction}
                        setLinkBookingId={() => { }} // Handled internally in Requests if needed, or we pass a setter
                        setMeetingLink={() => { }}
                        onVerificationRequested={() => {
                            queryClient.invalidateQueries({ queryKey: ['gurubaProfile', user?.id] });
                        }}
                    />
                );
            case 'requests':
                return (
                    <GurubaRequests
                        bookings={bookings}
                        handleBookingAction={handleBookingAction}
                        handleAddLink={handleAddLink}
                    />
                );
            case 'messages':
                return (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-stone-900 mb-6">Client Messages</h2>
                        <ChatInterface />
                    </div>
                );
            case 'schedule':
                return <GurubaSchedule guruba={guruba || null} />;
            case 'services':
                return <GurubaServices guruba={guruba || null} />;
            case 'clients':
                return <GurubaClients bookings={bookings} />;
            case 'resources':
                return <GurubaResources />;
            case 'profile':
                return <GurubaProfile guruba={guruba || null} showSetupAlert={shouldShowSetup} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex font-sans">
            <aside className={`
                hidden md:flex flex-col bg-white border-r border-stone-200 z-10
                h-[calc(100vh-4rem)] sticky top-16
                transition-all duration-300 ease-in-out
                ${isSidebarCollapsed ? 'w-20' : 'w-72'}
            `}>
                <div className={`p-6 border-b border-stone-100 ${isSidebarCollapsed ? 'p-2' : ''}`}>
                    <div className={`flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 transition-all ${isSidebarCollapsed ? 'lg:justify-center lg:p-0 lg:py-4 lg:bg-transparent lg:border-none' : ''}`}>
                        <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold shadow-md overflow-hidden shrink-0">
                            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : displayName[0]}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="overflow-hidden">
                                <p className="font-bold text-stone-900 truncate text-sm">{displayName}</p>
                                <p className="text-xs text-stone-500 truncate font-medium">Guruba</p>
                            </div>
                        )}
                    </div>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={ListChecks} label="Booking Requests" active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} badge={pendingCount || null} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={Calendar} label="Availability" active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={Briefcase} label="My Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={Users} label="My Clients" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} isCollapsed={isSidebarCollapsed} />
                    <SidebarItem icon={BookOpen} label="Resources" active={activeTab === 'resources'} onClick={() => handleTabChange('resources')} isCollapsed={isSidebarCollapsed} />
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
                    <button onClick={() => signOut()} className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
                        <LogOut className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && 'Sign Out'}
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-10 overflow-y-auto h-[calc(100vh-4rem)] pb-safe-area pb-24 md:pb-10">
                <div className="md:hidden mb-4 flex items-center justify-between">
                    <span className="font-outfit font-bold text-stone-900 text-2xl capitalize">{activeTab}</span>
                </div>

                {shouldShowSetup && activeTab !== 'profile' && (
                    <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-900">Profile Setup Required</h3>
                            <p className="text-sm text-red-700 mt-1">
                                Your profile is incomplete. Please complete your profile to become visible to clients.
                            </p>
                            <button
                                onClick={() => handleTabChange('profile')}
                                className="mt-3 text-sm font-bold text-red-700 hover:text-red-800 underline"
                            >
                                Complete Profile Now &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-full text-saffron-600">
                        <RefreshCw className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    renderContent()
                )}
            </main>
        </div>
    );
};
