
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Availability, Booking, Guruba, Service, Gotra, GurubaService } from '../../types';
import { ChatInterface } from '../messages/ChatInterface';
import { 
    Calendar, Clock, DollarSign, MapPin, Star, Zap, RefreshCw, AlertCircle, Save, Check, 
    LayoutDashboard, ListChecks, User, LogOut, XCircle, CheckCircle, Settings, MessageSquare, BarChart3,
    Briefcase, Users, BookOpen, Plus, Trash2, PlusCircle, Video, Menu, X, Edit3
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

// Internal Gotra Select Component
const GotraSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [gotras, setGotras] = useState<Gotra[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchGotras = async () => {
            const { data } = await supabase.from('gotras').select('*').eq('status', 'approved').order('name');
            setGotras(data || []);
        };
        fetchGotras();
    }, []);

    useEffect(() => {
        if (value && !searchTerm) {
             setSearchTerm(value);
        }
    }, [value]);

    const filtered = gotras.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleRequestNew = async () => {
        if (!searchTerm.trim()) return;
        try {
            const { error } = await supabase.from('gotras').insert({ name: searchTerm.trim(), status: 'pending' });
            if (error && error.code !== '23505') throw error;
            
            onChange(searchTerm.trim());
            setShowDropdown(false);
            alert(`Requested to add '${searchTerm}'. Selected pending approval.`);
        } catch (e) {
            alert("Failed to request Gotra.");
        }
    };

    return (
        <div className="relative">
            <label className="block text-sm font-bold text-stone-900 mb-2">Lineage (Gotra)</label>
            <div className="relative">
                <input 
                    className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Select or request your Gotra..."
                />
                {showDropdown && searchTerm && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg border border-stone-200 max-h-60 overflow-auto">
                        {filtered.length > 0 ? (
                            filtered.map(g => (
                                <button
                                    key={g.id}
                                    className="w-full text-left px-4 py-3 hover:bg-stone-100 text-sm border-b border-stone-50 last:border-0"
                                    onClick={() => {
                                        onChange(g.name);
                                        setSearchTerm(g.name);
                                        setShowDropdown(false);
                                    }}
                                >
                                    {g.name}
                                </button>
                            ))
                        ) : (
                            <button
                                className="w-full text-left px-4 py-3 hover:bg-saffron-50 text-sm text-saffron-700 font-medium flex items-center gap-2"
                                onClick={handleRequestNew}
                            >
                                <PlusCircle className="h-4 w-4" /> Request to add "{searchTerm}"
                            </button>
                        )}
                    </div>
                )}
            </div>
            {showDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowDropdown(false)}></div>}
        </div>
    );
};

export const GurubaDashboard: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'messages' | 'schedule' | 'services' | 'clients' | 'resources' | 'profile'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [guruba, setGuruba] = useState<Guruba | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<GurubaService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Schedule Edit State
  const [schedule, setSchedule] = useState<{ [key: number]: { start: string, end: string, enabled: boolean } }>({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [busyMode, setBusyMode] = useState(false); // UI toggle for "Select Busy Hour" vs "Select Available Hour"

  // Negotiation State
  const [proposingBookingId, setProposingBookingId] = useState<string | null>(null);
  const [proposedTime, setProposedTime] = useState('');

  // Profile Edit
  const [bio, setBio] = useState('');
  const [gotraId, setGotraId] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
        // 1. Fetch Guruba Profile
        let { data: gurubaRows, error: gurubaError } = await supabase
            .from('gurubas')
            .select('*, profiles:user_id(gotra_id)')
            .eq('user_id', user?.id);
            
        let gurubaData = gurubaRows?.[0];

        // Auto-provision if missing
        if ((!gurubaRows || gurubaRows.length === 0) && !gurubaError) {
             const { data: newGuruba, error: createError } = await supabase.from('gurubas').insert([{ user_id: user?.id }]).select().single();
             if (createError && createError.code !== '23505') throw createError;
             if (createError && createError.code === '23505') {
                  const { data: retry } = await supabase.from('gurubas').select('*, profiles:user_id(gotra_id)').eq('user_id', user?.id).single();
                  gurubaData = retry;
             } else {
                  gurubaData = newGuruba;
             }
        } else if (gurubaError) {
             throw gurubaError;
        }
        
        if (gurubaData) {
            gurubaData.email = user?.email;
        }
        
        setGuruba(gurubaData);
        setBio(gurubaData.bio || '');
        setGotraId(gurubaData.profiles?.gotra_id || '');

        // 2. Get Bookings
        const { data: bookingData } = await supabase
            .from('bookings')
            .select(`*, services:service_id (title, base_price, duration_minutes), profiles:user_id (full_name, phone, email, avatar_url)`)
            .eq('guruba_id', gurubaData.id)
            .order('scheduled_at', { ascending: true });
        
        setBookings(bookingData || []);

        // 3. Get Availability
        const { data: availData } = await supabase.from('guruba_availability').select('*').eq('guruba_id', gurubaData.id);
        setAvailability(availData || []);
        
        const initialSchedule: any = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availData?.find(a => a.day_of_week === index);
            initialSchedule[index] = found 
                ? { start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: true }
                : { start: '05:00', end: '21:00', enabled: true }; // Default 5am-9pm enabled
        });
        setSchedule(initialSchedule);

        // 4. Get All Services & My Services
        const { data: servicesData } = await supabase.from('services').select('*').order('title');
        setAllServices(servicesData || []);

        const { data: myServicesData } = await supabase.from('guruba_services').select('*').eq('guruba_id', gurubaData.id);
        setMyServices(myServicesData || []);

    } catch (e: any) {
        console.error(e);
        setError("Failed to load dashboard data.");
    } finally {
        setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled' | 'completed') => {
      try {
          await supabase.from('bookings').update({ status: action }).eq('id', bookingId);
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action } : b));
      } catch (e) {
          alert("Action failed");
      }
  };

  const handleProposeTime = async (bookingId: string) => {
      if (!proposedTime) return;
      // TODO: Add validation for +/- 5 hours logic here
      try {
          const confirmationDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
          await supabase.from('bookings').update({ 
              status: 'awaiting_client_confirmation',
              proposed_time: proposedTime,
              confirmation_deadline: confirmationDeadline
          }).eq('id', bookingId);
          
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'awaiting_client_confirmation', proposed_time: proposedTime } : b));
          setProposingBookingId(null);
          setProposedTime('');
      } catch(e) {
          alert("Failed to propose time.");
      }
  };

  const saveSchedule = async () => {
      if (!guruba) return;
      setSavingSchedule(true);
      try {
          await supabase.from('guruba_availability').delete().eq('guruba_id', guruba.id);
          const rows = Object.entries(schedule)
            .filter(([_, val]) => (val as any).enabled)
            .map(([day, val]) => {
                const v = val as any;
                return {
                    guruba_id: guruba.id,
                    day_of_week: parseInt(day),
                    start_time: v.start,
                    end_time: v.end
                };
            });
          if (rows.length > 0) await supabase.from('guruba_availability').insert(rows);
          alert("Schedule updated!");
      } catch (e) { alert("Failed"); } finally { setSavingSchedule(false); }
  };

  const toggleService = async (serviceId: string, currentStatus: boolean) => {
      if (!guruba) return;
      if (currentStatus) {
          // Remove
          await supabase.from('guruba_services').delete().match({ guruba_id: guruba.id, service_id: serviceId });
          setMyServices(prev => prev.filter(s => s.service_id !== serviceId));
      } else {
          // Add
          await supabase.from('guruba_services').insert({ guruba_id: guruba.id, service_id: serviceId, is_online: false });
          setMyServices(prev => [...prev, { guruba_id: guruba.id, service_id: serviceId, is_online: false }]);
      }
  };

  const toggleOnlineService = async (serviceId: string, currentOnline: boolean) => {
       if (!guruba) return;
       await supabase.from('guruba_services').update({ is_online: !currentOnline }).match({ guruba_id: guruba.id, service_id: serviceId });
       setMyServices(prev => prev.map(s => s.service_id === serviceId ? { ...s, is_online: !currentOnline } : s));
  };

  const saveProfile = async () => {
      if (!guruba) return;
      setSavingProfile(true);
      try {
          await supabase.from('gurubas').update({ bio }).eq('id', guruba.id);
          await supabase.from('profiles').update({ gotra_id: gotraId }).eq('id', user?.id);
          alert("Profile updated!");
      } catch (e) { alert("Failed"); } finally { setSavingProfile(false); }
  };

  // Derived Data
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const earnings = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0);

  // CRM Helper
  const getUniqueClients = () => {
      const clients: {[key: string]: any} = {};
      bookings.forEach(b => {
          if (!b.profiles) return;
          if (!clients[b.profiles.id]) {
              clients[b.profiles.id] = {
                  ...b.profiles,
                  total_spend: 0,
                  booking_count: 0,
                  last_booking: b.scheduled_at
              };
          }
          clients[b.profiles.id].booking_count++;
          if (b.status === 'completed') {
             clients[b.profiles.id].total_spend += (b.services?.base_price || 0);
          }
          if (new Date(b.scheduled_at) > new Date(clients[b.profiles.id].last_booking)) {
              clients[b.profiles.id].last_booking = b.scheduled_at;
          }
      });
      return Object.values(clients);
  };

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'overview':
              return (
                  <div className="space-y-8 animate-in fade-in duration-500">
                      {!guruba?.is_verified && (
                          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-yellow-800 shadow-sm">
                              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                              </div>
                              <div className="flex-1 text-center sm:text-left">
                                  <p className="font-bold text-lg">Complete Your Verification</p>
                                  <p className="text-sm mt-1 opacity-90">Upload your citizenship and Vedic certificates to get the "Verified" badge.</p>
                              </div>
                              <Button variant="outline" className="bg-white border-yellow-300 text-yellow-900 hover:bg-yellow-100 whitespace-nowrap">Start Verification</Button>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Total Earnings</h3>
                              <div className="text-3xl font-bold text-stone-900 flex items-center gap-1">
                                <DollarSign className="h-6 w-6 text-stone-400" /> {(earnings || 0).toLocaleString()}
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Client Rating</h3>
                              <div className="flex items-center gap-2">
                                  <span className="text-3xl font-bold text-stone-900">{guruba?.rating || 5.0}</span>
                                  <div className="flex text-yellow-400">
                                      {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                                  </div>
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Completed Rituals</h3>
                              <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Pending Requests</h3>
                              <div className="text-3xl font-bold text-saffron-600">{pendingCount}</div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                              <div className="flex justify-between items-center mb-6">
                                  <h3 className="font-bold text-lg text-stone-900">Upcoming Confirmed Rituals</h3>
                                  <Button variant="ghost" size="sm">View Calendar</Button>
                              </div>
                              <div className="space-y-4">
                                  {bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                                      <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">No upcoming confirmed rituals.</div>
                                  ) : (
                                      bookings.filter(b => b.status === 'confirmed').slice(0, 5).map(b => (
                                          <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-stone-100 rounded-xl hover:bg-stone-50 transition-colors gap-4">
                                              <div className="flex items-center gap-4">
                                                  <div className="h-14 w-14 bg-saffron-50 rounded-xl flex flex-col items-center justify-center text-saffron-700 border border-saffron-100 shadow-sm">
                                                      <span className="text-xs font-bold uppercase">{new Date(b.scheduled_at).toLocaleString('default', {month: 'short'})}</span>
                                                      <span className="text-xl font-bold">{new Date(b.scheduled_at).getDate()}</span>
                                                  </div>
                                                  <div>
                                                      <h4 className="font-bold text-stone-900 text-lg">{b.services?.title}</h4>
                                                      <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
                                                          <Clock className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                                          <span className="mx-1">•</span>
                                                          <User className="h-3 w-3" /> {b.profiles?.full_name}
                                                      </p>
                                                  </div>
                                              </div>
                                              <Button size="sm" className="w-full sm:w-auto" onClick={() => handleBookingAction(b.id, 'completed')}>
                                                  Mark Completed
                                              </Button>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </div>

                          <div className="bg-stone-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
                             <div>
                                <h3 className="font-bold text-lg mb-2">Weekly Performance</h3>
                                <p className="text-stone-400 text-sm">Your activity this week.</p>
                             </div>
                             <div className="h-40 flex items-end justify-between gap-2 mt-6 px-2">
                                {[40, 70, 30, 85, 50, 65, 90].map((h, i) => (
                                    <div key={i} className="w-full bg-stone-700 rounded-t-md relative group">
                                        <div className="absolute bottom-0 left-0 w-full bg-saffron-500 rounded-t-md transition-all duration-1000" style={{ height: `${h}%` }}></div>
                                    </div>
                                ))}
                             </div>
                             <div className="flex justify-between text-xs text-stone-500 mt-2 px-2">
                                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                             </div>
                          </div>
                      </div>
                  </div>
              );

          case 'requests':
              return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h2 className="text-2xl font-bold text-stone-900">Booking Requests</h2>
                      {bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_client_confirmation').length === 0 ? (
                          <div className="bg-stone-50 rounded-2xl p-16 text-center border border-stone-200 border-dashed">
                              <ListChecks className="h-12 w-12 mx-auto text-stone-300 mb-4" />
                              <h3 className="text-lg font-medium text-stone-900">No Pending Requests</h3>
                              <p className="text-stone-500 mt-2">New booking requests from clients will appear here.</p>
                          </div>
                      ) : (
                          <div className="grid gap-6">
                              {bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_client_confirmation').map(b => (
                                  <div key={b.id} className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 hover:shadow-lg transition-shadow">
                                      <div className="flex flex-col md:flex-row justify-between gap-8">
                                          <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-4">
                                                  <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm ${b.status === 'pending' ? 'bg-blue-600 shadow-blue-200' : 'bg-purple-600 shadow-purple-200'}`}>
                                                      {b.status === 'pending' ? 'New Request' : 'Negotiating Time'}
                                                  </span>
                                                  <span className="text-sm text-stone-500 font-medium">{new Date(b.created_at).toLocaleDateString()}</span>
                                              </div>
                                              <h3 className="text-2xl font-bold text-stone-900 mb-2">{b.services?.title}</h3>
                                              <div className="space-y-2 mt-4 bg-stone-50 p-4 rounded-xl">
                                                  <div className="flex items-center gap-3">
                                                     <div className="h-8 w-8 rounded-full bg-stone-200 overflow-hidden">
                                                         <img src={b.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="h-full w-full object-cover" />
                                                     </div>
                                                     <p className="text-stone-900 font-bold">{b.profiles?.full_name}</p>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                                      <p className="text-stone-600 flex items-center gap-2">
                                                          <Clock className="h-4 w-4 text-stone-400" /> {new Date(b.scheduled_at).toLocaleString()}
                                                      </p>
                                                      <p className="text-stone-600 flex items-center gap-2">
                                                          <DollarSign className="h-4 w-4 text-green-600" /> Pays <span className="font-bold text-green-700">Rs. {(b.services?.base_price || 0).toLocaleString()}</span>
                                                      </p>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {b.status === 'pending' ? (
                                              <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                                                  <Button onClick={() => handleBookingAction(b.id, 'confirmed')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base shadow-lg shadow-green-900/10">
                                                      <CheckCircle className="h-5 w-5 mr-2" /> Accept
                                                  </Button>
                                                  
                                                  {proposingBookingId === b.id ? (
                                                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg animate-in fade-in">
                                                          <label className="text-xs font-bold text-stone-500 mb-1 block">Proposed Time</label>
                                                          <input 
                                                              type="datetime-local" 
                                                              className="w-full text-sm border rounded p-1 mb-2"
                                                              value={proposedTime}
                                                              onChange={e => setProposedTime(e.target.value)}
                                                          />
                                                          <div className="flex gap-2">
                                                              <Button size="sm" onClick={() => handleProposeTime(b.id)} className="flex-1 text-xs">Send</Button>
                                                              <Button size="sm" variant="outline" onClick={() => setProposingBookingId(null)} className="flex-1 text-xs">Cancel</Button>
                                                          </div>
                                                      </div>
                                                  ) : (
                                                      <Button variant="secondary" onClick={() => setProposingBookingId(b.id)} className="w-full">
                                                          <Edit3 className="h-4 w-4 mr-2" /> Propose Time
                                                      </Button>
                                                  )}

                                                  <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3">
                                                      <XCircle className="h-5 w-5 mr-2" /> Decline
                                                  </Button>
                                              </div>
                                          ) : (
                                              <div className="flex flex-col justify-center items-center min-w-[180px] bg-stone-50 rounded-xl p-4 text-center border border-stone-200 border-dashed">
                                                  <Clock className="h-8 w-8 text-saffron-400 mb-2" />
                                                  <p className="text-sm font-medium text-stone-600">Awaiting Client Confirmation</p>
                                                  <p className="text-xs text-stone-400 mt-1">Proposed: {b.proposed_time ? new Date(b.proposed_time).toLocaleString() : 'N/A'}</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              );
        
          case 'messages':
              return (
                  <div className="animate-in slide-in-from-right-4 duration-300">
                      <h2 className="text-2xl font-bold text-stone-900 mb-6">Client Messages</h2>
                      <ChatInterface />
                  </div>
              );

          case 'schedule':
              return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                              <h2 className="text-2xl font-bold text-stone-900">Availability Settings</h2>
                              <p className="text-sm text-stone-500">Default availability is 05:00 AM - 09:00 PM. Adjust specific days below.</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-stone-200 shadow-sm">
                              <button onClick={() => setBusyMode(false)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!busyMode ? 'bg-saffron-100 text-saffron-800' : 'text-stone-500 hover:bg-stone-50'}`}>Set Working Hours</button>
                              <button onClick={() => setBusyMode(true)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${busyMode ? 'bg-red-100 text-red-800' : 'text-stone-500 hover:bg-stone-50'}`}>Set Busy/Off</button>
                          </div>
                          <Button onClick={saveSchedule} isLoading={savingSchedule} className="gap-2">
                              <Save className="h-4 w-4" /> Save Changes
                          </Button>
                      </div>
                      
                      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-4">
                          {DAYS_OF_WEEK.map((day, idx) => (
                              <div key={day} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${schedule[idx]?.enabled ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                      <div className="relative flex items-center">
                                          <input 
                                              type="checkbox" 
                                              checked={schedule[idx]?.enabled || false}
                                              onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], enabled: e.target.checked }})}
                                              className="h-6 w-6 rounded-md border-stone-300 text-saffron-600 focus:ring-saffron-500 cursor-pointer"
                                          />
                                      </div>
                                      <span className={`font-bold text-lg ${schedule[idx]?.enabled ? 'text-stone-900' : 'text-stone-400'}`}>{day}</span>
                                  </div>
                                  {schedule[idx]?.enabled ? (
                                      <div className="flex items-center gap-3">
                                          <div className="relative">
                                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                              <input 
                                                  type="time" 
                                                  value={schedule[idx]?.start}
                                                  onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], start: e.target.value }})}
                                                  className="pl-9 pr-3 py-2 border-stone-200 rounded-lg text-sm font-medium focus:border-saffron-500 focus:ring-saffron-500"
                                              />
                                          </div>
                                          <span className="text-stone-400 font-medium">-</span>
                                          <div className="relative">
                                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                              <input 
                                                  type="time" 
                                                  value={schedule[idx]?.end}
                                                  onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], end: e.target.value }})}
                                                  className="pl-9 pr-3 py-2 border-stone-200 rounded-lg text-sm font-medium focus:border-saffron-500 focus:ring-saffron-500"
                                              />
                                          </div>
                                      </div>
                                  ) : (
                                      <span className="text-sm font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full uppercase tracking-wide">Day Off / Busy</span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              );
            
          case 'services':
              return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h2 className="text-2xl font-bold text-stone-900 mb-2">My Services</h2>
                      <p className="text-stone-600 mb-6">Select the rituals you are qualified to perform. You can also specify if you offer them online.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {allServices.map(service => {
                              const myService = myServices.find(s => s.service_id === service.id);
                              const isActive = !!myService;
                              const isOnline = myService?.is_online || false;

                              return (
                                  <div 
                                    key={service.id} 
                                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                                        isActive 
                                        ? 'border-saffron-500 bg-white shadow-md' 
                                        : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                                    }`}
                                  >
                                      <div className="flex justify-between items-start mb-3">
                                          <h3 className={`font-bold text-lg ${isActive ? 'text-saffron-900' : 'text-stone-500'}`}>{service.title}</h3>
                                          <div onClick={() => toggleService(service.id, isActive)} className={`cursor-pointer h-6 w-6 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-saffron-500 text-white' : 'border-2 border-stone-300'}`}>
                                              {isActive && <Check className="h-4 w-4" />}
                                          </div>
                                      </div>
                                      <p className="text-sm text-stone-500 line-clamp-2 mb-3">{service.description}</p>
                                      
                                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                                            <div className="flex items-center gap-3 text-xs font-medium text-stone-400">
                                                <span>Rs. {service.base_price}</span>
                                                <span>•</span>
                                                <span>{service.duration_minutes} min</span>
                                            </div>
                                            {/* Online Toggle if Service Supports it */}
                                            {isActive && service.is_online_enabled && (
                                                <div 
                                                    onClick={() => toggleOnlineService(service.id, isOnline)}
                                                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full cursor-pointer select-none transition-colors ${isOnline ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-stone-100 text-stone-400 border border-stone-200'}`}
                                                >
                                                    <Video className="h-3 w-3" />
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </div>
                                            )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              );

          case 'clients':
              return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                       <h2 className="text-2xl font-bold text-stone-900">My Clients</h2>
                       <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                           <table className="w-full text-left text-sm">
                               <thead className="bg-stone-50 text-stone-500 uppercase font-bold text-xs border-b border-stone-100">
                                   <tr>
                                       <th className="px-6 py-4">Client Name</th>
                                       <th className="px-6 py-4">Contact</th>
                                       <th className="px-6 py-4 text-center">Bookings</th>
                                       <th className="px-6 py-4 text-right">Total Spend</th>
                                       <th className="px-6 py-4 text-right">Last Seen</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-stone-100">
                                   {getUniqueClients().map((client: any) => (
                                       <tr key={client.id} className="hover:bg-stone-50 transition-colors">
                                           <td className="px-6 py-4">
                                               <div className="flex items-center gap-3">
                                                   <div className="h-8 w-8 rounded-full bg-stone-200 overflow-hidden">
                                                       <img src={client.avatar_url || 'https://via.placeholder.com/40'} className="h-full w-full object-cover" />
                                                   </div>
                                                   <span className="font-bold text-stone-900">{client.full_name}</span>
                                               </div>
                                           </td>
                                           <td className="px-6 py-4 text-stone-500">
                                               <div className="flex flex-col">
                                                   <span>{client.phone || 'N/A'}</span>
                                                   <span className="text-xs opacity-70">{client.email}</span>
                                               </div>
                                           </td>
                                           <td className="px-6 py-4 text-center font-medium">{client.booking_count}</td>
                                           <td className="px-6 py-4 text-right font-bold text-green-600">Rs. {(client.total_spend || 0).toLocaleString()}</td>
                                           <td className="px-6 py-4 text-right text-stone-500">{new Date(client.last_booking).toLocaleDateString()}</td>
                                       </tr>
                                   ))}
                                   {getUniqueClients().length === 0 && (
                                       <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-400">No clients yet.</td></tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                  </div>
              );

          case 'resources':
              return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h2 className="text-2xl font-bold text-stone-900">Vedic Resources</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[
                              { title: "Satyanarayan Katha (Sanskrit)", type: "PDF", size: "2.4 MB" },
                              { title: "Swasthani Brata Katha (Nepali)", type: "PDF", size: "5.1 MB" },
                              { title: "Griha Pravesh Samagri Checklist", type: "List", size: "150 KB" },
                              { title: "Vedic Mantras Audio Collection", type: "MP3", size: "45 MB" },
                              { title: "Nepali Patro 2081", type: "PDF", size: "3.2 MB" },
                          ].map((res, i) => (
                              <div key={i} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="h-10 w-10 bg-saffron-50 rounded-lg flex items-center justify-center text-saffron-600 group-hover:bg-saffron-500 group-hover:text-white transition-colors">
                                          <BookOpen className="h-5 w-5" />
                                      </div>
                                      <span className="text-xs font-bold bg-stone-100 text-stone-500 px-2 py-1 rounded">{res.type}</span>
                                  </div>
                                  <h3 className="font-bold text-stone-900 mb-1">{res.title}</h3>
                                  <p className="text-xs text-stone-400">{res.size}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              );

          case 'profile':
              return (
                  <div className="max-w-3xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <h2 className="text-2xl font-bold text-stone-900">Public Profile</h2>
                      
                      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-sm font-bold text-stone-900 mb-2">Bio & Experience</label>
                                  <textarea 
                                      value={bio}
                                      onChange={(e) => setBio(e.target.value)}
                                      rows={6}
                                      className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 text-base p-4"
                                      placeholder="Describe your lineage (Gotra), vedic education (Gurukul), and experience performing rituals..."
                                  />
                              </div>
                              
                              {/* Gotra Select */}
                              <GotraSelect 
                                  value={gotraId}
                                  onChange={setGotraId}
                              />

                              <div>
                                  <label className="block text-sm font-bold text-stone-900 mb-2">Active Services</label>
                                  <div className="flex flex-wrap gap-2 p-4 bg-stone-50 rounded-xl border border-stone-200 min-h-[60px]">
                                      {myServices.length === 0 ? <span className="text-stone-400 text-sm italic">No services selected. Go to 'Services' tab to add.</span> : 
                                      myServices.map(s => {
                                          const serviceName = allServices.find(as => as.id === s.service_id)?.title || 'Unknown Service';
                                          return (
                                              <span key={s.service_id} className="bg-white border border-stone-200 px-3 py-1 rounded-full text-sm font-medium text-stone-700 shadow-sm flex items-center gap-1">
                                                  {serviceName}
                                                  {s.is_online && <Video className="h-3 w-3 text-blue-500 ml-1" />}
                                              </span>
                                          )
                                      })}
                                  </div>
                              </div>
                              <div className="pt-4 flex justify-end">
                                  <Button onClick={saveProfile} isLoading={savingProfile} size="lg">Update Profile</Button>
                              </div>
                          </div>
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
            <div className="p-6 border-b border-stone-100">
                <div className="flex justify-between items-center lg:hidden mb-4">
                    <span className="font-bold text-lg text-stone-900">Menu</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-stone-100">
                        <X className="h-6 w-6 text-stone-500" />
                    </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold shadow-md">
                        {profile?.full_name?.[0] || 'G'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-stone-900 text-sm truncate">{profile?.full_name}</p>
                        {profile?.email && <p className="text-xs text-stone-500 truncate">{profile.email}</p>}
                        <p className="text-xs text-saffron-600 font-medium">Verified Guruba</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
                <SidebarItem icon={ListChecks} label="Requests" active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} badge={pendingCount > 0 ? pendingCount : null} />
                <SidebarItem icon={Briefcase} label="My Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} />
                <SidebarItem icon={Users} label="My Clients" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} />
                <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} />
                <SidebarItem icon={Calendar} label="Schedule" active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} />
                <SidebarItem icon={BookOpen} label="Resources" active={activeTab === 'resources'} onClick={() => handleTabChange('resources')} />
                <div className="my-4 h-px bg-stone-100 mx-2" />
                <SidebarItem icon={Settings} label="Profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
            </nav>
            <div className="p-6 border-t border-stone-100">
                <button onClick={() => signOut().then(() => window.location.reload())} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
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
                <span className="font-bold text-stone-900 text-lg">Guruba Dashboard</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-full text-saffron-600">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
            ) : error ? (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> {error}
                </div>
            ) : (
                renderContent()
            )}
        </main>
    </div>
  );
};
