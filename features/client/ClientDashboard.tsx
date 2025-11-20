
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { ReviewModal } from './ReviewModal';
import { Booking, Transaction, Notification } from '../../types';
import { 
  Calendar, Clock, AlertCircle, RefreshCw,
  LayoutDashboard, CreditCard, Settings, LogOut, Search, Filter, User, Camera
} from 'lucide-react';

// Sidebar Navigation Component
const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
      active ? 'bg-saffron-50 text-saffron-700' : 'text-stone-600 hover:bg-stone-100'
    }`}
  >
    <Icon className={`h-5 w-5 ${active ? 'text-saffron-600' : 'text-stone-400'}`} />
    {label}
  </button>
);

export const ClientDashboard: React.FC = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'wallet' | 'settings'>('overview');
  
  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Review State
  const [reviewModalData, setReviewModalData] = useState<{id: string, gurubaId: string, gurubaName: string} | null>(null);

  // Edit Profile State
  const [updateLoading, setUpdateLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    gotra_id: '',
    avatar_url: ''
  });

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        gotra_id: profile.gotra_id || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setFetchError(null);
    
    try {
      // 1. Fetch Bookings
      const { data: reviews } = await supabase.from('reviews').select('booking_id').eq('user_id', user?.id);
      const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id));

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (title, duration_minutes, base_price),
          gurubas:guruba_id (
            id,
            location,
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookingsWithReviewStatus = bookingsData?.map(b => ({
          ...b,
          is_reviewed: reviewedBookingIds.has(b.id)
      })) as Booking[];
      setBookings(bookingsWithReviewStatus || []);

      // 2. Fetch Transactions (Mock if not exists)
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      setTransactions(transData || []);

      // 3. Fetch Notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setNotifications(notifData || []);

    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setFetchError('Failed to load some dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 500000) { 
            alert("Image too large. Please select an image under 500KB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileForm(prev => ({ ...prev, avatar_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    setFetchError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          gotra_id: profileForm.gotra_id,
          avatar_url: profileForm.avatar_url
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      alert("Profile updated successfully");
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setFetchError(err.message || "Failed to update profile details.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSignOut = async () => {
      await signOut();
      navigate('/login');
  };

  // Helper for booking status colors
  const getStatusColor = (status: string) => {
      switch(status) {
          case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
          case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      }
  };

  // Render Content based on Active Tab
  const renderContent = () => {
    switch (activeTab) {
        case 'overview':
            return (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="text-stone-500 text-sm font-medium mb-2">Total Bookings</h3>
                            <div className="text-3xl font-bold text-stone-900">{bookings.length}</div>
                            <p className="text-xs text-stone-400 mt-1">Lifetime rituals</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="text-stone-500 text-sm font-medium mb-2">Upcoming</h3>
                            <div className="text-3xl font-bold text-saffron-600">
                                {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length}
                            </div>
                            <p className="text-xs text-stone-400 mt-1">Scheduled rituals</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="text-stone-500 text-sm font-medium mb-2">Wallet Balance</h3>
                            <div className="text-3xl font-bold text-stone-900">$0.00</div>
                            <p className="text-xs text-stone-400 mt-1">Credits available</p>
                        </div>
                    </div>

                    {/* Next Booking Banner */}
                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length > 0 ? (
                        <div className="bg-gradient-to-r from-saffron-500 to-saffron-600 rounded-xl p-6 text-white shadow-md">
                             <div className="flex justify-between items-center mb-4">
                                 <h2 className="text-lg font-bold flex items-center gap-2">
                                     <Calendar className="h-5 w-5" /> Up Next
                                 </h2>
                                 <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                                     Confirmed
                                 </span>
                             </div>
                             {(() => {
                                 const next = bookings.find(b => b.status === 'confirmed' || b.status === 'pending');
                                 if (!next) return null;
                                 return (
                                     <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                         <div>
                                             <h3 className="text-2xl font-bold mb-1">{next.services?.title}</h3>
                                             <p className="opacity-90 flex items-center gap-2 text-sm">
                                                 <Clock className="h-4 w-4" /> 
                                                 {new Date(next.scheduled_at).toLocaleString()} 
                                                 <span className="mx-1">•</span> 
                                                 {next.services?.duration_minutes} mins
                                             </p>
                                         </div>
                                         <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm min-w-[200px]">
                                             <p className="text-xs opacity-75 mb-1">Performed by</p>
                                             <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                                                    {next.gurubas?.profiles?.avatar_url ? (
                                                        <img src={next.gurubas.profiles.avatar_url} className="h-full w-full object-cover" />
                                                    ) : <User className="h-4 w-4" />}
                                                </div>
                                                <span className="font-medium">{next.gurubas?.profiles?.full_name}</span>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })()}
                        </div>
                    ) : (
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center">
                            <div className="mx-auto h-12 w-12 bg-stone-200 rounded-full flex items-center justify-center mb-3">
                                <Calendar className="h-6 w-6 text-stone-400" />
                            </div>
                            <h3 className="text-stone-900 font-medium">No upcoming rituals</h3>
                            <p className="text-stone-500 text-sm mb-4">Book a service to start your spiritual journey.</p>
                            <Button onClick={() => navigate('/book')}>Book Now</Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Recent Activity Table */}
                        <div className="md:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
                                <h3 className="font-bold text-stone-900">Recent Bookings</h3>
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab('bookings')}>View All</Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                                        <tr>
                                            <th className="px-4 py-3">Service</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Guruba</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings.slice(0, 5).map(b => (
                                            <tr key={b.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                                                <td className="px-4 py-3 font-medium text-stone-900">{b.services?.title}</td>
                                                <td className="px-4 py-3 text-stone-500">{new Date(b.scheduled_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-stone-600">{b.gurubas?.profiles?.full_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(b.status)}`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">${b.services?.base_price}</td>
                                            </tr>
                                        ))}
                                        {bookings.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-8 text-stone-500">No history found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Quick Profile Card */}
                        <div className="rounded-lg bg-white p-6 shadow border border-stone-200">
                            <h3 className="font-semibold text-stone-900 mb-4">My Profile</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-600 font-bold overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="h-full w-full object-cover" />
                                    ) : (
                                        displayName[0]
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold">{displayName}</p>
                                    <p className="text-xs text-stone-500">{user?.email}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Gotra:</span>
                                    <span className="font-medium">{profile?.gotra_id || 'Not Set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Phone:</span>
                                    <span className="font-medium">{profile?.phone || 'Not Set'}</span>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => setActiveTab('settings')}
                            >
                                Edit Profile
                            </Button>
                        </div>
                    </div>
                </div>
            );
        
        case 'bookings':
            return (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-stone-900">My Bookings</h2>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                                <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 w-full border border-stone-300 rounded-lg text-sm" />
                            </div>
                            <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filter</Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {bookings.map(booking => (
                            <div key={booking.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col md:flex-row gap-6">
                                <div className="flex-shrink-0">
                                    <div className="h-24 w-24 bg-stone-100 rounded-lg overflow-hidden">
                                        <div className="h-full w-full flex items-center justify-center bg-saffron-50 text-saffron-600 font-bold text-2xl">
                                            {booking.services?.title[0]}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-stone-900">{booking.services?.title}</h3>
                                            <p className="text-sm text-stone-500">ID: #{booking.id.slice(0,8)}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                            {booking.status.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div>
                                            <span className="text-xs text-stone-400 block uppercase tracking-wide">Date & Time</span>
                                            <span className="text-sm font-medium text-stone-800 flex items-center gap-1 mt-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(booking.scheduled_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-stone-400 block uppercase tracking-wide">Duration</span>
                                            <span className="text-sm font-medium text-stone-800 flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3" />
                                                {booking.services?.duration_minutes} mins
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-stone-400 block uppercase tracking-wide">Guruba</span>
                                            <span className="text-sm font-medium text-stone-800 flex items-center gap-1 mt-1">
                                                <User className="h-3 w-3" />
                                                {booking.gurubas?.profiles?.full_name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-stone-400 block uppercase tracking-wide">Total Cost</span>
                                            <span className="text-sm font-bold text-stone-900 mt-1">
                                                ${booking.services?.base_price}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-3 pt-4 border-t border-stone-100">
                                        {booking.status === 'completed' && !booking.is_reviewed && (
                                            <Button size="sm" onClick={() => setReviewModalData({
                                                id: booking.id,
                                                gurubaId: booking.guruba_id,
                                                gurubaName: booking.gurubas?.profiles?.full_name || ''
                                            })}>Rate Service</Button>
                                        )}
                                        <Button size="sm" variant="outline">Download Invoice</Button>
                                        <Button size="sm" variant="ghost" className="text-stone-500">View Details</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {bookings.length === 0 && (
                             <div className="text-center py-12 text-stone-500 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
                                No bookings found matching your criteria.
                             </div>
                        )}
                    </div>
                </div>
            );

        case 'wallet':
            return (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-stone-900">Wallet & Transactions</h2>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-stone-400 text-sm font-medium">Available Balance</p>
                                    <h3 className="text-4xl font-bold mt-1">$0.00</h3>
                                </div>
                                <CreditCard className="h-8 w-8 text-stone-500" />
                            </div>
                            <div className="flex gap-3">
                                <Button size="sm" className="bg-white text-stone-900 hover:bg-stone-200 border-0">Add Funds</Button>
                                <Button size="sm" variant="outline" className="border-stone-600 text-stone-300 hover:bg-stone-800">Withdraw</Button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                            <h3 className="font-bold text-stone-900 mb-4">Payment Methods</h3>
                            <div className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg mb-3">
                                <div className="h-8 w-12 bg-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-500">VISA</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-stone-900">Ending in 4242</p>
                                    <p className="text-xs text-stone-500">Expires 12/25</p>
                                </div>
                                <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">+ Add New Method</Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-stone-50 border-b border-stone-200">
                            <h3 className="font-bold text-stone-900">Transaction History</h3>
                        </div>
                        {transactions.length > 0 ? (
                             <table className="w-full text-sm">
                                 <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                                     <tr>
                                         <th className="px-6 py-3 text-left">Date</th>
                                         <th className="px-6 py-3 text-left">Description</th>
                                         <th className="px-6 py-3 text-left">Type</th>
                                         <th className="px-6 py-3 text-right">Amount</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {transactions.map(t => (
                                         <tr key={t.id} className="border-b border-stone-100">
                                             <td className="px-6 py-4 text-stone-500">{new Date(t.created_at).toLocaleDateString()}</td>
                                             <td className="px-6 py-4 font-medium text-stone-900">{t.description}</td>
                                             <td className="px-6 py-4">
                                                 <span className={`text-xs px-2 py-1 rounded-full ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-800'}`}>
                                                     {t.type.toUpperCase()}
                                                 </span>
                                             </td>
                                             <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-stone-900'}`}>
                                                 {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        ) : (
                             <div className="p-8 text-center text-stone-500">No transactions recorded yet.</div>
                        )}
                    </div>
                </div>
            );

        case 'settings':
            return (
                <div className="max-w-2xl">
                    <h2 className="text-xl font-bold text-stone-900 mb-6">Account Settings</h2>
                    
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-6">
                        <h3 className="text-lg font-medium text-stone-900 mb-4">Personal Information</h3>
                        
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative group">
                                <div className="h-20 w-20 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                                    {profileForm.avatar_url ? (
                                        <img src={profileForm.avatar_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-8 w-8 text-stone-400" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-saffron-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-saffron-700 shadow-sm">
                                    <Camera className="h-3 w-3" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <div>
                                <h4 className="font-medium text-stone-900">{displayName}</h4>
                                <p className="text-sm text-stone-500">{user?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.full_name}
                                        onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" 
                                        placeholder="Your Full Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" 
                                        placeholder="Your Phone"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Gotra</label>
                                <input 
                                    type="text" 
                                    value={profileForm.gotra_id}
                                    onChange={(e) => setProfileForm({...profileForm, gotra_id: e.target.value})}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" 
                                    placeholder="e.g. Kashyap"
                                />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button onClick={handleSaveProfile} isLoading={updateLoading}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${updateLoading ? 'animate-spin' : ''}`} />
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                        <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                        <p className="text-sm text-stone-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">Delete Account</Button>
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 hidden md:flex flex-col sticky top-16 h-[calc(100vh-4rem)]">
         <div className="p-6 border-b border-stone-100">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold overflow-hidden border border-saffron-200">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="h-full w-full object-cover" />
                    ) : (
                        displayName[0]
                    )}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-stone-900 truncate text-sm">{displayName}</p>
                    <p className="text-xs text-stone-500 truncate">Client Account</p>
                </div>
            </div>
         </div>

         <nav className="flex-1 p-4">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <SidebarItem icon={Calendar} label="My Bookings" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} />
            <SidebarItem icon={CreditCard} label="Wallet" active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
            <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
         </nav>

         <div className="p-4 border-t border-stone-100">
             <div className="mb-4 px-4">
                 <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Notifications</h4>
                 {notifications.length > 0 ? (
                    <div className="space-y-2">
                        {notifications.map(n => (
                            <div key={n.id} className="text-xs bg-stone-50 p-2 rounded border border-stone-100">
                                <p className="font-medium text-stone-900">{n.title}</p>
                                <p className="text-stone-500 truncate">{n.message}</p>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-xs text-stone-400 italic">No new notifications</p>
                 )}
             </div>
             <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                 <LogOut className="h-4 w-4" /> Sign Out
             </button>
         </div>
      </aside>

      {/* Mobile Warning (simple implementation for now) */}
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
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
                fetchDashboardData();
            }}
        />
      )}
    </div>
  );
};
