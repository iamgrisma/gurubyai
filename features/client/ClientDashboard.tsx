
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { ReviewModal } from './ReviewModal';
import { ChatInterface } from '../messages/ChatInterface';
import { Booking, Transaction } from '../../types';
import { 
  Calendar, Clock, AlertCircle, RefreshCw,
  LayoutDashboard, CreditCard, User, LogOut, Menu, X, Phone
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
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'messages' | 'wallet'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalData, setReviewModalData] = useState<{id: string, gurubaId: string, gurubaName: string} | null>(null);

  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

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

      // Transactions
      const { data: transData } = await supabase.from('transactions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      setTransactions(transData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount);
    if (!amount || amount <= 0) return;
    
    setTopUpLoading(true);
    try {
        const { error } = await supabase.rpc('top_up_wallet', {
            p_user_id: user?.id,
            p_amount: amount
        });
        if (error) throw error;
        
        setTopUpAmount('');
        // refreshProfile is handled in AuthProvider but we want to see balance update
        // Ideally we call refreshProfile() but it's not destructured. 
        // For now, fetching dashboard data. Profile update happens via Auth context refresh or page reload.
        // Let's just reload dashboard
        await fetchDashboardData();
        window.location.reload(); // Force refresh to get new balance in auth context
    } catch (e: any) {
        alert("Top-up failed: " + e.message);
    } finally {
        setTopUpLoading(false);
    }
  };

  const handleBookingNegotiation = async (bookingId: string, action: 'accept' | 'decline', proposedTime?: string) => {
      try {
          if (action === 'accept') {
              if (!proposedTime) return;
              const date = new Date(proposedTime);
              if (isNaN(date.getTime())) return; 

              await supabase.from('bookings').update({ 
                  status: 'confirmed',
                  scheduled_at: proposedTime
              }).eq('id', bookingId);
              setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed', scheduled_at: proposedTime } : b));
          } else {
              await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
              setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
          }
      } catch(e) {
          alert("Action failed");
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'confirmed': return 'bg-green-100 text-green-800 ring-green-600/20';
          case 'completed': return 'bg-blue-100 text-blue-800 ring-blue-600/20';
          case 'cancelled': return 'bg-red-100 text-red-800 ring-red-600/20';
          case 'awaiting_client_confirmation': return 'bg-purple-100 text-purple-800 ring-purple-600/20';
          default: return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
      }
  };

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'overview':
            const actionRequiredBookings = bookings.filter(b => b.status === 'awaiting_client_confirmation');
            return (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Hero Welcome */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 to-stone-800 p-8 text-white shadow-xl">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                           <div>
                               <h2 className="text-3xl font-bold mb-2">Namaste, {displayName} 🙏</h2>
                               <p className="text-stone-300 max-w-lg">Balance: <span className="font-bold text-saffron-400">Rs. {(profile?.balance || 0).toLocaleString()}</span></p>
                           </div>
                           <Button onClick={() => navigate('/book')} className="bg-saffron-600 hover:bg-saffron-700 border-none shadow-lg shadow-saffron-900/20 py-3 px-6 text-base w-full md:w-auto">
                               Book New Service
                           </Button>
                        </div>
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    </div>
                    
                    {actionRequiredBookings.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 animate-in slide-in-from-top-2">
                            <h3 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" /> Action Required
                            </h3>
                            <div className="grid gap-4">
                                {actionRequiredBookings.map(b => (
                                    <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                <Clock className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-stone-900">{b.services?.title}</p>
                                                <p className="text-sm text-stone-600">
                                                    Guruba proposed a new time: <span className="font-bold text-purple-700">{b.proposed_time ? new Date(b.proposed_time).toLocaleString() : 'N/A'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <Button onClick={() => handleBookingNegotiation(b.id, 'accept', b.proposed_time)} className="bg-green-600 hover:bg-green-700 w-full">Confirm Time</Button>
                                            <Button onClick={() => handleBookingNegotiation(b.id, 'decline')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 w-full">Decline</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <h3 className="text-stone-500 text-sm font-medium">Total Bookings</h3>
                            <div className="text-3xl font-bold text-stone-900">{bookings.length}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                            <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-600">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <h3 className="text-stone-500 text-sm font-medium">Wallet Balance</h3>
                            <div className="text-3xl font-bold text-stone-900">Rs. {(profile?.balance || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <h3 className="text-stone-500 text-sm font-medium">Completed Rituals</h3>
                            <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
                        </div>
                    </div>

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
                                                    <Calendar className="h-3 w-3" /> {new Date(booking.scheduled_at).toLocaleDateString()} 
                                                    <Clock className="h-3 w-3 ml-2" /> {new Date(booking.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
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

                        <div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-full">
                                <h3 className="font-bold text-lg text-stone-900 mb-4">My Profile</h3>
                                <div className="text-center mb-6">
                                    <div className="h-24 w-24 mx-auto bg-stone-100 rounded-full overflow-hidden mb-3 border-4 border-white shadow-md">
                                        {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <User className="h-12 w-12 text-stone-300 m-6" />}
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
                                        <span className="text-stone-500 flex items-center gap-2"><User className="h-4 w-4"/> Gotra</span>
                                        <span className="font-medium text-stone-900">{profile?.gotra_id || 'N/A'}</span>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => navigate('/client/profile')}>
                                    Edit Profile
                                </Button>
                            </div>
                        </div>
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
                                            {booking.status === 'awaiting_client_confirmation' ? 'Action Required' : booking.status}
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
                                            <p className="font-bold text-stone-900">Rs. {(booking.services?.base_price || 0).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end">
                                        {booking.status === 'awaiting_client_confirmation' && (
                                            <Button size="sm" onClick={() => handleBookingNegotiation(booking.id, 'accept', booking.proposed_time)} className="bg-green-600 hover:bg-green-700">
                                                Confirm New Time
                                            </Button>
                                        )}
                                        {booking.status === 'completed' && !booking.is_reviewed && (
                                            <Button size="sm" onClick={() => setReviewModalData({ id: booking.id, gurubaId: booking.guruba_id, gurubaName: booking.gurubas?.profiles?.full_name || '' })}>
                                                Write Review
                                            </Button>
                                        )}
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
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="w-full h-56 bg-gradient-to-br from-stone-800 to-stone-950 rounded-3xl p-8 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <span className="text-stone-400 font-medium tracking-wider">Guruba Balance</span>
                                <CreditCard className="h-8 w-8 opacity-80" />
                            </div>
                            <div className="relative z-10">
                                <span className="text-4xl font-bold tracking-tight">Rs. {(profile?.balance || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-end relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-xs text-stone-400 uppercase mb-1">Holder</span>
                                    <span className="font-medium tracking-wide uppercase">{displayName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                            <h3 className="font-bold text-stone-900 mb-4">Add Funds</h3>
                            <form onSubmit={handleTopUp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Amount (NPR)</label>
                                    <input type="number" min="100" step="100" required className="w-full border rounded-xl p-3 text-lg" placeholder="e.g. 500" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full py-3" isLoading={topUpLoading}>Top Up Wallet</Button>
                            </form>
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
                                            <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-stone-900'}`}>{t.type === 'credit' ? '+' : '-'}Rs. {(t.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      {/* Mobile Menu Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-stone-200 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
         <div className="p-6">
            <div className="flex justify-between items-center lg:hidden mb-4">
                <span className="font-bold text-lg text-stone-900">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-stone-100">
                    <X className="h-6 w-6 text-stone-500" />
                </button>
            </div>

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
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
            <SidebarItem icon={Calendar} label="Bookings" active={activeTab === 'bookings'} onClick={() => handleTabChange('bookings')} badge={bookings.filter(b=>b.status==='confirmed').length || null} />
            <SidebarItem icon={Menu} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} />
            <SidebarItem icon={CreditCard} label="Wallet" active={activeTab === 'wallet'} onClick={() => handleTabChange('wallet')} />
            <div className="my-4 h-px bg-stone-100 mx-2" />
            <SidebarItem icon={User} label="My Profile" active={false} onClick={() => navigate('/client/profile')} />
         </nav>

         <div className="p-6">
             <button onClick={() => signOut().then(() => navigate('/'))} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                 <LogOut className="h-4 w-4" /> Sign Out
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="lg:hidden mb-6 flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200 text-stone-600">
                  <Menu className="h-6 w-6" />
              </button>
              <span className="font-bold text-stone-900 text-lg">Dashboard</span>
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
                fetchDashboardData();
            }}
        />
      )}
    </div>
  );
};
