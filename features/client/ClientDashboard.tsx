
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { ReviewModal } from './ReviewModal';
import { ChatInterface } from '../messages/ChatInterface';
import { Booking, Transaction, Notification } from '../../types';
import { 
  Calendar, Clock, AlertCircle, RefreshCw,
  LayoutDashboard, CreditCard, Settings, LogOut, Search, Filter, User, Camera,
  MessageSquare, CheckCircle, Receipt
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl mb-1 ${
      active ? 'bg-saffron-50 text-saffron-700 shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:translate-x-1'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${active ? 'text-saffron-600' : 'text-stone-400'}`} />
      {label}
    </div>
    {badge && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>}
  </button>
);

export const ClientDashboard: React.FC = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'messages' | 'wallet' | 'settings'>('overview');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalData, setReviewModalData] = useState<{id: string, gurubaId: string, gurubaName: string} | null>(null);

  // Edit Profile State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    gotra_id: '',
    avatar_url: '',
    city: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        gotra_id: profile.gotra_id || '',
        avatar_url: profile.avatar_url || '',
        city: profile.city || ''
      });
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (title, duration_minutes, base_price, image_url),
          gurubas:guruba_id (
            id,
            location,
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Check reviews
      const { data: reviews } = await supabase.from('reviews').select('booking_id').eq('user_id', user?.id);
      const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id));

      const processedBookings = bookingsData?.map(b => ({
          ...b,
          is_reviewed: reviewedBookingIds.has(b.id)
      })) as Booking[];
      setBookings(processedBookings || []);

      // Transactions (Mocking some if empty for visual pop)
      const { data: transData } = await supabase.from('transactions').select('*').eq('user_id', user?.id);
      setTransactions(transData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    try {
      const { error } = await supabase.from('profiles').update(profileForm).eq('id', user?.id);
      if (error) throw error;
      await refreshProfile();
      alert("Profile updated successfully");
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'confirmed': return 'bg-green-100 text-green-800 ring-green-600/20';
          case 'completed': return 'bg-blue-100 text-blue-800 ring-blue-600/20';
          case 'cancelled': return 'bg-red-100 text-red-800 ring-red-600/20';
          default: return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
      }
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'overview':
            return (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Hero Welcome */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 to-stone-800 p-8 text-white shadow-xl">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                           <div>
                               <h2 className="text-3xl font-bold mb-2">Namaste, {displayName} 🙏</h2>
                               <p className="text-stone-300 max-w-lg">Your spiritual journey continues. You have {bookings.filter(b => b.status === 'confirmed').length} upcoming rituals scheduled.</p>
                           </div>
                           <Button onClick={() => navigate('/book')} className="bg-saffron-600 hover:bg-saffron-700 border-none shadow-lg shadow-saffron-900/20 py-3 px-6 text-base">
                               Book New Service
                           </Button>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    </div>

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
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <h3 className="text-stone-500 text-sm font-medium">Completed Rituals</h3>
                            <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                            <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-600">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <h3 className="text-stone-500 text-sm font-medium">Total Spent</h3>
                            <div className="text-3xl font-bold text-stone-900">$0.00</div>
                        </div>
                    </div>

                    {/* Upcoming Bookings */}
                    <div>
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
                                                <Calendar className="h-3 w-3" /> {new Date(booking.scheduled_at).toLocaleDateString()} 
                                                <Clock className="h-3 w-3 ml-2" /> {new Date(booking.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
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
                </div>
            );
        
        case 'bookings':
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">All Bookings</h2>
                    <div className="grid gap-4">
                        {bookings.map(booking => (
                            <div key={booking.id} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row gap-6">
                                <div className="w-full lg:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                                    <img src={booking.services?.image_url} className="w-full h-full object-cover" alt={booking.services?.title} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-900">{booking.services?.title}</h3>
                                            <p className="text-sm text-stone-500 mt-1 flex items-center gap-2">
                                                <User className="h-4 w-4" /> {booking.gurubas?.profiles?.full_name} ({booking.gurubas?.location})
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ring-1 ring-inset ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 py-4 border-t border-stone-50">
                                        <div>
                                            <p className="text-xs text-stone-400 uppercase">Date</p>
                                            <p className="font-medium">{new Date(booking.scheduled_at).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 uppercase">Time</p>
                                            <p className="font-medium">{new Date(booking.scheduled_at).toLocaleTimeString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 uppercase">Cost</p>
                                            <p className="font-bold text-stone-900">${booking.services?.base_price}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end">
                                        {booking.status === 'completed' && !booking.is_reviewed && (
                                            <Button size="sm" onClick={() => setReviewModalData({ id: booking.id, gurubaId: booking.guruba_id, gurubaName: booking.gurubas?.profiles?.full_name || '' })}>
                                                Write Review
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="gap-2">
                                            <Receipt className="h-4 w-4" /> Invoice
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        
        case 'messages':
            return (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900 mb-6">Messages</h2>
                    <ChatInterface />
                </div>
            );

        case 'wallet':
            return (
                <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">Wallet</h2>
                    {/* Credit Card Style */}
                    <div className="w-full max-w-md h-56 bg-gradient-to-br from-stone-800 to-stone-950 rounded-3xl p-8 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-stone-400 font-medium tracking-wider">Guruba Balance</span>
                            <CreditCard className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-4xl font-bold tracking-tight">$0.00</span>
                        </div>
                        <div className="flex justify-between items-end relative z-10">
                             <div className="flex flex-col">
                                 <span className="text-xs text-stone-400 uppercase mb-1">Holder</span>
                                 <span className="font-medium tracking-wide uppercase">{displayName}</span>
                             </div>
                             <div className="flex flex-col items-end">
                                 <span className="text-xs text-stone-400 uppercase mb-1">Expires</span>
                                 <span className="font-medium tracking-wide">12/28</span>
                             </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-stone-100">
                            <h3 className="font-bold text-lg">Transaction History</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-stone-50 text-stone-500 font-medium text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-left">Description</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-stone-500">No transactions yet.</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} className="border-b border-stone-100 last:border-0">
                                            <td className="px-6 py-4 text-stone-500">{new Date(t.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium">{t.description}</td>
                                            <td className="px-6 py-4 text-right font-bold">{t.type === 'credit' ? '+' : '-'}${t.amount}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

        case 'settings':
            return (
                <div className="max-w-2xl space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">Profile Settings</h2>
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="h-24 w-24 rounded-full bg-stone-100 border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer">
                                {profileForm.avatar_url ? <img src={profileForm.avatar_url} className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-stone-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Camera className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-stone-900">{profileForm.full_name || 'Your Name'}</h3>
                                <p className="text-stone-500">{user?.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                                <input 
                                    className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500" 
                                    value={profileForm.full_name}
                                    onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
                                <input 
                                    className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500" 
                                    value={profileForm.phone}
                                    onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Gotra</label>
                                <input 
                                    className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500" 
                                    value={profileForm.gotra_id}
                                    onChange={e => setProfileForm({...profileForm, gotra_id: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
                                <input 
                                    className="w-full rounded-lg border-stone-200 focus:ring-saffron-500 focus:border-saffron-500" 
                                    value={profileForm.city}
                                    onChange={e => setProfileForm({...profileForm, city: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSaveProfile} isLoading={updateLoading}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-stone-200 hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
         <div className="p-6">
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold shadow-md overflow-hidden">
                     {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : displayName[0]}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-stone-900 truncate text-sm">{displayName}</p>
                    <p className="text-xs text-stone-500 truncate font-medium">Client Account</p>
                </div>
            </div>
         </div>

         <nav className="flex-1 px-4 space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <SidebarItem icon={Calendar} label="Bookings" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} badge={bookings.filter(b=>b.status==='confirmed').length || null} />
            <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
            <SidebarItem icon={CreditCard} label="Wallet" active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
            <div className="my-4 h-px bg-stone-100 mx-2" />
            <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
         </nav>

         <div className="p-6">
             <button onClick={() => signOut().then(() => navigate('/'))} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                 <LogOut className="h-4 w-4" /> Sign Out
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-4rem)]">
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
