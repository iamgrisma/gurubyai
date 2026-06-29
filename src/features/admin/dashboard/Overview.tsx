

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { DollarSign, Users, UserPlus, Calendar, Shield, ScrollText } from 'lucide-react';
import { AdminNotificationPanel } from '../../../components/admin/AdminNotificationPanel';

// StatCard Component (Localized here)
const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color = "blue" }: any) => {
    const colorStyles: any = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-stone-200/50 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-stone-500 text-sm font-medium uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-bold text-stone-900 mt-1">{value}</h3>
                {trendLabel && <p className="text-stone-400 text-xs mt-2">{trendLabel}</p>}
            </div>
        </div>
    );
};

interface OverviewProps {
    setActiveTab: (tab: any) => void;
}

export const AdminOverview: React.FC<OverviewProps> = ({ setActiveTab }) => {
    const { data: stats = { users: 0, gurubas: 0, bookings: 0, revenue: 0, pending_verifications: 0, pending_gotras: 0 }, isLoading } = useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => {
            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: gCount } = await supabase.from('gurubas').select('*', { count: 'exact', head: true });
            const { count: bCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
            const { count: vCount } = await supabase.from('gurubas').select('*', { count: 'exact', head: true }).eq('is_verified', false);
            const { count: gotraCount } = await supabase.from('gotras').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            const { data: feeData } = await supabase.from('bookings').select('platform_fee').eq('status', 'completed');
            const revenue = feeData?.reduce((acc, curr) => acc + (curr.platform_fee || 0), 0) || 0;

            return { users: uCount || 0, gurubas: gCount || 0, bookings: bCount || 0, revenue, pending_verifications: vCount || 0, pending_gotras: gotraCount || 0 };
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Dashboard Overview</h2>
                <p className="text-stone-500">Welcome back, Administrator. Here is what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-stone-100 animate-pulse h-36 rounded-3xl"></div>
                    ))
                ) : (
                    <>
                        <StatCard title="Total Revenue" value={`Cr ${(stats.revenue || 0).toLocaleString()}`} icon={DollarSign} trend={12} trendLabel="vs last month" color="green" />
                        <StatCard title="Total Users" value={stats.users} icon={Users} trend={5} trendLabel="new this week" color="blue" />
                        <StatCard title="Active Gurubas" value={stats.gurubas} icon={UserPlus} trend={2} trendLabel="verified recently" color="purple" />
                        <StatCard title="Total Bookings" value={stats.bookings} icon={Calendar} trend={8} trendLabel="completion rate" color="orange" />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-stone-900">Revenue Analytics</h3>
                        <select className="text-xs border-stone-200 rounded-md text-stone-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-2 border-b border-stone-100 pb-4">
                        {[45, 60, 35, 70, 80, 55, 90].map((h, i) => (
                            <div key={i} className="w-full relative group">
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs font-bold text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">{h * 10}</div>
                                <div className="w-full bg-saffron-100 hover:bg-saffron-500 rounded-t-md transition-all duration-500" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-stone-400 mt-2 px-2 font-medium">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm p-6 lg:p-8">
                    <h3 className="font-bold text-lg text-stone-900 mb-6">Pending Actions</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full shadow-sm text-yellow-600"><Shield className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-sm font-bold text-stone-900">Guruba Verifications</p>
                                    <p className="text-xs text-stone-500">{stats.pending_verifications} pending requests</p>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-yellow-700 hover:bg-yellow-100" onClick={() => setActiveTab('verification')}>Review</Button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full shadow-sm text-blue-600"><ScrollText className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-sm font-bold text-stone-900">Gotra Requests</p>
                                    <p className="text-xs text-stone-500">{stats.pending_gotras} new submissions</p>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100" onClick={() => setActiveTab('gotras')}>Review</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications Panel */}
            <AdminNotificationPanel />
        </div>
    );
};
