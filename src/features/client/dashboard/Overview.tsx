"use client";

// features/client/dashboard/Overview.tsx

import React from 'react';

import { useRouter, redirect } from "next/navigation";
import { Button } from '../../../components/ui/Button';
import { Booking, UserProfile } from '../../../types';
import { User } from '@supabase/supabase-js';
import { 
  Calendar, Clock, AlertCircle, RefreshCw,
  CreditCard, User as UserIcon, Phone, Video
} from 'lucide-react';

interface OverviewProps {
  user: User | null;
  profile: UserProfile | null;
  bookings: Booking[];
  setActiveTab: (tab: 'overview' | 'bookings' | 'messages' | 'wallet' | 'profile') => void;
  handleBookingNegotiation: (bookingId: string, action: 'accept' | 'decline', proposedTime?: string) => Promise<void>;
}

export const DashboardOverview: React.FC<OverviewProps> = ({ user, profile, bookings, setActiveTab, handleBookingNegotiation }) => {
  const router = useRouter();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const actionRequiredBookings = bookings.filter(b => b.status === 'awaiting_client_confirmation');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* Hero Welcome */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 to-stone-800 p-8 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Namaste, {displayName} 🙏</h2>
                    <p className="text-stone-300 max-w-lg">
                        Your spiritual journey continues. You have <span className="text-saffron-400 font-bold">{profile?.credits || 0} Credits</span> available.
                    </p>
                </div>
                <Button onClick={() => router.push('/book')} className="bg-saffron-600 hover:bg-saffron-700 border-none shadow-lg shadow-saffron-900/20 py-3 px-6 text-base w-full md:w-auto">
                    Book New Service
                </Button>
            </div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Action Required Section */}
        {actionRequiredBookings.length > 0 && (
            <div className="glass-panel border border-stone-200/50 rounded-2xl p-6 animate-in slide-in-from-top-2 border-l-4 border-l-saffron-500 mb-8 shadow-sm">
                <h3 className="font-bold text-stone-900 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-saffron-500" /> Action Required
                </h3>
                <div className="grid gap-4">
                    {actionRequiredBookings.map(b => (
                        <div key={b.id} className="bg-white/80 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-md hover:bg-white">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-saffron-50 flex items-center justify-center text-saffron-600 border border-saffron-100 shadow-inner">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-lg">{b.services?.title}</p>
                                    <div className="text-sm text-stone-600 mt-1 flex items-center gap-2">
                                        Guruba proposed a new time: 
                                        <span className="font-bold text-stone-900 bg-white px-2 py-1 rounded border border-stone-100 shadow-sm inline-block">
                                            {b.proposed_time ? new Date(b.proposed_time).toLocaleString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                                <Button onClick={() => handleBookingNegotiation(b.id, 'accept', b.proposed_time)} className="bg-green-600 hover:bg-green-700 w-full shadow-md shadow-green-900/20 text-white font-medium">Confirm Time</Button>
                                <Button onClick={() => handleBookingNegotiation(b.id, 'decline')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 w-full shadow-sm font-medium bg-white">Decline</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                    <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-stone-500 text-sm font-medium">Total Bookings</h3>
                <div className="text-3xl font-bold text-stone-900">{bookings.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="text-stone-500 text-sm font-medium">Completed Rituals</h3>
                <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-600">
                    <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="text-stone-500 text-sm font-medium">Available Credits</h3>
                <div className="text-3xl font-bold text-stone-900">{profile?.credits || 0}</div>
            </div>
        </div>

        {/* Dashboard Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-stone-900 mb-4">Upcoming Schedule</h3>
                {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                        {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').slice(0,3).map(booking => (
                            <div key={booking.id} className="flex flex-col md:flex-row items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm gap-6">
                                <div className="h-16 w-16 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                                    <img src={booking.services?.image_url} className="h-full w-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h4 className="font-bold text-stone-900">{booking.services?.title}</h4>
                                    <p className="text-sm text-stone-500 flex items-center justify-center md:justify-start gap-2 mt-1">
                                        <Calendar className="h-3 w-3" /> 
                                        {booking.scheduled_at || booking.proposed_time
                                            ? new Date(booking.scheduled_at || booking.proposed_time || '').toLocaleDateString()
                                            : 'Awaiting scheduling'}
                                        <Clock className="h-3 w-3 ml-2" /> 
                                        {booking.scheduled_at || booking.proposed_time
                                            ? new Date(booking.scheduled_at || booking.proposed_time || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                            : 'N/A'}
                                    </p>
                                    {booking.meeting_link && booking.status === 'confirmed' && (
                                        <a href={booking.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-2 py-1 rounded mt-2 hover:bg-green-700">
                                            <Video className="h-3 w-3" /> Join Call
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs text-stone-400 uppercase font-semibold">Guruba</p>
                                        <p className="text-sm font-medium">{booking.gurubas?.profiles?.full_name}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-stone-200 overflow-hidden">
                                        <img src={booking.gurubas?.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="h-full w-full object-cover" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100 border-dashed">
                        <p className="text-stone-500">No upcoming rituals. Time to book one?</p>
                    </div>
                )}
            </div>

            {/* Profile Card */}
            <div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-full">
                    <h3 className="font-bold text-lg text-stone-900 mb-4">My Profile</h3>
                    <div className="text-center mb-6">
                        <div className="h-24 w-24 mx-auto bg-stone-100 rounded-full overflow-hidden mb-3 border-4 border-white shadow-md">
                            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-stone-300 m-6" />}
                        </div>
                        <p className="font-bold text-stone-900 text-lg">{profile?.full_name || 'Update Name'}</p>
                        <p className="text-sm text-stone-500">{user?.email}</p>
                    </div>
                    <div className="space-y-4 text-sm mb-8">
                        <div className="flex justify-between items-center p-2 bg-stone-50 rounded-lg">
                            <span className="text-stone-500 flex items-center gap-2"><Phone className="h-4 w-4"/> Phone</span>
                            <span className="font-medium text-stone-900">{profile?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-stone-50 rounded-lg">
                            <span className="text-stone-500 flex items-center gap-2"><UserIcon className="h-4 w-4"/> Gotra</span>
                            <span className="font-medium text-stone-900">{profile?.gotra_id || 'N/A'}</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab('profile')}>
                        Edit Profile
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
