// features/guruba/GurubaDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Availability, Booking, Guruba, Service, Gotra, GurubaService } from '../../types';
import { ChatInterface } from '../messages/ChatInterface';
import { useBookings, useServices, useUpdateBookingStatus } from '../../hooks/queries';
// FIX: Added XCircle to lucide-react imports
import { 
    Calendar, Clock, DollarSign, MapPin, Star, RefreshCw, AlertCircle, Save, Check, 
    LayoutDashboard, ListChecks, User, LogOut, CheckCircle, Settings, MessageSquare,
    Briefcase, Users, BookOpen, PlusCircle, Video, Menu, X, Edit3, Link as LinkIcon, XCircle,
    BadgeCheck, ShieldAlert, Sparkles, ChevronsLeft, ChevronsRight
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, isCollapsed }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center py-3 text-sm font-medium transition-all duration-200 rounded-xl mb-1 group ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      } ${
        active ? 'bg-saffron-50 text-saffron-700 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
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

// Internal Gotra Select Component (kept same)
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'messages' | 'schedule' | 'services' | 'clients' | 'resources' | 'profile'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // --- Queries ---
  
  // 1. Fetch Current Guruba Profile
  const { data: guruba, isLoading: gurubaLoading } = useQuery({
    queryKey: ['gurubaProfile', user?.id],
    queryFn: async () => {
        if (!user?.id) return null;
        const { data } = await supabase.from('gurubas').select('*, profiles:user_id(gotra_id)').eq('user_id', user.id).single();
        return data as Guruba;
    },
    enabled: !!user?.id
  });

  // 2. Fetch Bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(user?.id, 'guruba');

  // 3. Fetch All Services
  const { data: allServices = [] } = useServices();

  // 4. Fetch My Selected Services
  const { data: myServices = [] } = useQuery({
      queryKey: ['myServices', guruba?.id],
      queryFn: async () => {
          const { data } = await supabase.from('guruba_services').select('*').eq('guruba_id', guruba?.id);
          return data as GurubaService[];
      },
      enabled: !!guruba?.id
  });

  // 5. Fetch Availability
  const { data: availability = [] } = useQuery({
      queryKey: ['availability', guruba?.id],
      queryFn: async () => {
          const { data } = await supabase.from('guruba_availability').select('*').eq('guruba_id', guruba?.id);
          return data as Availability[];
      },
      enabled: !!guruba?.id
  });

  // --- Mutations ---
  const updateStatusMutation = useUpdateBookingStatus();
  
  // Schedule Edit State
  const [schedule, setSchedule] = useState<{ [key: number]: { start: string, end: string, enabled: boolean } }>({});
  
  // Negotiation State
  const [proposingBookingId, setProposingBookingId] = useState<string | null>(null);
  const [proposedTime, setProposedTime] = useState('');

  // Link State
  const [linkBookingId, setLinkBookingId] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState('');

  // Profile Edit
  const [bio, setBio] = useState('');
  const [gotraId, setGotraId] = useState('');
  const [gurubaType, setGurubaType] = useState<'brahmin' | 'non_brahmin' | 'astrologer'>('brahmin');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // My Services filter
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  // Sync Schedule state when availability loads
  useEffect(() => {
    if (availability) {
        const initialSchedule: any = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availability.find(a => a.day_of_week === index);
            initialSchedule[index] = found 
                ? { start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: true }
                : { start: '09:00', end: '17:00', enabled: false }; // Default to OFF
        });
        setSchedule(initialSchedule);
    }
  }, [availability]);

  // Sync Profile state
  useEffect(() => {
      if (guruba) {
          setBio(guruba.bio || '');
          setGotraId(guruba.profiles?.gotra_id || '');
          setGurubaType(guruba.guruba_type || 'brahmin');
      }
  }, [guruba]);

  const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled' | 'completed') => {
      updateStatusMutation.mutate({ id: bookingId, status: action });
  };

  const handleAddLink = async () => {
      if (!linkBookingId || !meetingLink) return;
      // Basic validation
      if (!meetingLink.startsWith('http') && !meetingLink.startsWith('wa.me')) {
          alert("Please enter a valid URL (starting with http://, https://, or wa.me/)");
          return;
      }

      updateStatusMutation.mutate({ id: linkBookingId, status: 'confirmed', meeting_link: meetingLink }, {
          onSuccess: () => {
              setLinkBookingId(null);
              setMeetingLink('');
              alert("Meeting link updated!");
          }
      });
  };

  const handleProposeTime = async (bookingId: string) => {
      if (!proposedTime) return;
      try {
          const confirmationDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          await supabase.from('bookings').update({ 
              status: 'awaiting_client_confirmation',
              proposed_time: proposedTime,
              confirmation_deadline: confirmationDeadline
          }).eq('id', bookingId);
          
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          setProposingBookingId(null);
          setProposedTime('');
      } catch(e) {
          alert("Failed to propose time.");
      }
  };

  const saveSchedule = async () => {
    if (!guruba) return;
    
    // Validate that end time is after start time
    const invalidDays = Object.entries(schedule)
        // FIX: Cast `val` to `any` to resolve properties. This is a common workaround for `Object.entries` on objects with numeric keys.
        .filter(([, val]) => (val as any).enabled && (val as any).start >= (val as any).end)
        .map(([day]) => DAYS_OF_WEEK[parseInt(day)]);

    if (invalidDays.length > 0) {
        alert(`Error: End time must be after start time for ${invalidDays.join(', ')}.`);
        return;
    }

    setSavingSchedule(true);
    try {
        const upsertRows = Object.entries(schedule)
            .filter(([, val]) => (val as any).enabled)
            .map(([day, val]) => ({
                guruba_id: guruba.id,
                day_of_week: parseInt(day),
                start_time: (val as any).start,
                end_time: (val as any).end,
            }));

        const deleteDays = Object.entries(schedule)
            .filter(([, val]) => !(val as any).enabled)
            .map(([day]) => parseInt(day));

        // Perform deletions for disabled days
        if (deleteDays.length > 0) {
            const { error: deleteError } = await supabase
                .from('guruba_availability')
                .delete()
                .eq('guruba_id', guruba.id)
                .in('day_of_week', deleteDays);
            if (deleteError) throw deleteError;
        }

        // Perform upserts for enabled days
        if (upsertRows.length > 0) {
            const { error: upsertError } = await supabase
                .from('guruba_availability')
                .upsert(upsertRows, { onConflict: 'guruba_id, day_of_week' });
            if (upsertError) throw upsertError;
        }
        
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        alert("Schedule updated successfully!");
    } catch (e: any) { 
        console.error("Failed to update schedule:", e);
        alert(`Failed to update schedule: ${e.message}`);
    } finally { 
        setSavingSchedule(false); 
    }
  };

  const toggleService = async (serviceId: string, currentStatus: boolean) => {
      if (!guruba) return;
      if (currentStatus) {
          await supabase.from('guruba_services').delete().match({ guruba_id: guruba.id, service_id: serviceId });
      } else {
          await supabase.from('guruba_services').insert({ guruba_id: guruba.id, service_id: serviceId, is_online: false });
      }
      queryClient.invalidateQueries({ queryKey: ['myServices'] });
  };

  const toggleOnlineService = async (serviceId: string, currentOnline: boolean) => {
       if (!guruba) return;
       await supabase.from('guruba_services').update({ is_online: !currentOnline }).match({ guruba_id: guruba.id, service_id: serviceId });
       queryClient.invalidateQueries({ queryKey: ['myServices'] });
  };

  const saveProfile = async () => {
      if (!guruba) return;
      setSavingProfile(true);
      try {
          await supabase.from('gurubas').update({ bio, guruba_type: gurubaType }).eq('id', guruba.id);
          await supabase.from('profiles').update({ gotra_id: gotraId }).eq('id', user?.id);
          queryClient.invalidateQueries({ queryKey: ['gurubaProfile'] });
          alert("Profile updated!");
      } catch (e) { alert("Failed"); } finally { setSavingProfile(false); }
  };

  // Derived Data
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const earnings = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0);

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

  const loading = gurubaLoading || bookingsLoading;
  
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

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
                                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('requests')}>View All</Button>
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
                                                      {b.meeting_link && (
                                                          <a href={b.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                                              <Video className="h-3 w-3" /> Video Link Active
                                                          </a>
                                                      )}
                                                  </div>
                                              </div>
                                              <div className="flex flex-col gap-2">
                                                  <Button size="sm" className="w-full sm:w-auto" onClick={() => handleBookingAction(b.id, 'completed')}>
                                                      Mark Completed
                                                  </Button>
                                                  <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs" onClick={() => { setLinkBookingId(b.id); setMeetingLink(b.meeting_link || ''); }}>
                                                      {b.meeting_link ? 'Edit Link' : 'Add Link'}
                                                  </Button>
                                              </div>
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
                      <h2 className="text-2xl font-bold text-stone-900">Booking Requests & Schedule</h2>
                      
                      {/* Add Meeting Link Modal */}
                      {linkBookingId && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                                  <h3 className="text-lg font-bold mb-4">Add Video Meeting Link</h3>
                                  <p className="text-sm text-stone-500 mb-4">Paste your Google Meet or WhatsApp link here. The client will see a "Join" button.</p>
                                  <input 
                                      className="w-full border rounded-lg p-3 mb-4" 
                                      placeholder="https://meet.google.com/..." 
                                      value={meetingLink}
                                      onChange={(e) => setMeetingLink(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                      <Button variant="ghost" onClick={() => setLinkBookingId(null)}>Cancel</Button>
                                      <Button onClick={handleAddLink}>Save Link</Button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').length === 0 ? (
                          <div className="bg-stone-50 rounded-2xl p-16 text-center border border-stone-200 border-dashed">
                              <ListChecks className="h-12 w-12 mx-auto text-stone-300 mb-4" />
                              <h3 className="text-lg font-medium text-stone-900">No Pending Requests</h3>
                              <p className="text-stone-500 mt-2">New booking requests from clients will appear here.</p>
                          </div>
                      ) : (
                          <div className="grid gap-6">
                              {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').map(b => (
                                  <div key={b.id} className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 hover:shadow-lg transition-shadow">
                                      <div className="flex flex-col md:flex-row justify-between gap-8">
                                          <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-4">
                                                  <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm ${
                                                      b.status === 'pending' ? 'bg-blue-600 shadow-blue-200' : 
                                                      b.status === 'confirmed' ? 'bg-green-600 shadow-green-200' :
                                                      'bg-purple-600 shadow-purple-200'
                                                  }`}>
                                                      {b.status === 'pending' ? 'New Request' : b.status === 'confirmed' ? 'Confirmed' : 'Negotiating'}
                                                  </span>
                                                  <span className="text-sm text-stone-500 font-medium">{new Date(b.created_at).toLocaleDateString()}</span>
                                              </div>
                                              <h3 className="text-2xl font-bold text-stone-900 mb-2">{b.services?.title}</h3>
                                              <div className="space-y-2 mt-4 bg-stone-50 p-4 rounded-xl">
                                                  <div className="flex items-center gap-3">
                                                     <div className="h-8 w-8 rounded-full bg-stone-200 overflow-hidden">
                                                         <img src={b.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="h-full w-full object-cover" />
                                                     </div>
                                                     <div className="flex-1">
                                                         <p className="text-stone-900 font-bold">{b.profiles?.full_name}</p>
                                                         {b.profiles?.phone && <p className="text-xs text-stone-500">{b.profiles.phone}</p>}
                                                     </div>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                                      <p className="text-stone-600 flex items-center gap-2">
                                                          <Clock className="h-4 w-4 text-stone-400" /> {new Date(b.scheduled_at).toLocaleString()}
                                                      </p>
                                                      <p className="text-stone-600 flex items-center gap-2">
                                                          <DollarSign className="h-4 w-4 text-green-600" /> Pays <span className="font-bold text-green-700">Rs. {(b.services?.base_price || 0).toLocaleString()}</span>
                                                      </p>
                                                  </div>
                                                  {b.status === 'confirmed' && (
                                                      <div className="mt-2 pt-2 border-t border-stone-200 flex items-center gap-2">
                                                          <Video className="h-4 w-4 text-blue-500" />
                                                          <span className="text-sm text-stone-600">Link: {b.meeting_link ? <a href={b.meeting_link} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">Open Link</a> : <span className="text-stone-400 italic">No link added</span>}</span>
                                                          <button onClick={() => { setLinkBookingId(b.id); setMeetingLink(b.meeting_link || ''); }} className="ml-auto text-xs text-stone-500 hover:text-stone-900 border px-2 py-1 rounded">
                                                              {b.meeting_link ? 'Edit' : 'Add'}
                                                          </button>
                                                      </div>
                                                  )}
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
                                          ) : b.status === 'confirmed' ? (
                                              <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                                                  <Button onClick={() => handleBookingAction(b.id, 'completed')} className="w-full">
                                                      Mark Completed
                                                  </Button>
                                                  <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full text-red-600">
                                                      Cancel Booking
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
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                              <h2 className="text-2xl font-bold text-stone-900">Availability Settings</h2>
                              <p className="text-sm text-stone-500 mt-1">Set your weekly working hours. Clients will only be able to book you during these times.</p>
                          </div>
                          <Button onClick={saveSchedule} isLoading={savingSchedule} className="gap-2 w-full md:w-auto">
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
                                      <span className="text-sm font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full uppercase tracking-wide">Day Off</span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              );
        case 'services':
            const myServiceIds = new Set(myServices.map(s => s.service_id));
            const serviceCategories = ['All', ...new Set(allServices.map(s => s.category).filter(Boolean) as string[])];
            const filteredServices = selectedServiceCategory === 'All'
                ? allServices
                : allServices.filter(s => s.category === selectedServiceCategory);
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-900">My Service Catalog</h2>
                        <p className="text-sm text-stone-500 mt-1">Select the services you are qualified to perform. This will appear on your public profile.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {serviceCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedServiceCategory(cat!)}
                                className={`px-4 py-2 text-sm font-medium rounded-full border ${selectedServiceCategory === cat ? 'bg-saffron-600 text-white border-saffron-700' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredServices.map(s => {
                            const isSelected = myServiceIds.has(s.id);
                            const myService = myServices.find(ms => ms.service_id === s.id);
                            return (
                                <div key={s.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-stone-200'}`}>
                                    <h4 className="font-bold text-stone-900">{s.title}</h4>
                                    <p className="text-xs text-stone-500 mt-1">{s.category}</p>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <Button size="sm" variant={isSelected ? 'secondary' : 'primary'} onClick={() => toggleService(s.id, isSelected)}>
                                            {isSelected ? <><XCircle className="h-4 w-4 mr-2" />Remove</> : <><PlusCircle className="h-4 w-4 mr-2"/>Add to my services</>}
                                        </Button>
                                        {isSelected && (
                                            <button onClick={() => toggleOnlineService(s.id, myService!.is_online)} className={`text-xs p-2 rounded-lg flex items-center justify-center gap-2 w-full ${myService!.is_online ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                                                <Video className="h-4 w-4"/> Available for Online Ritual? {myService!.is_online ? <Check className="h-4 w-4" /> : ''}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        case 'clients':
            const uniqueClients = getUniqueClients();
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">My Clients</h2>
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 text-left">Client</th>
                                    <th className="px-6 py-3 text-left">Last Booking</th>
                                    <th className="px-6 py-3 text-right">Total Dakshina</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueClients.map(c => (
                                    <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-stone-900">{c.full_name}</p>
                                            <p className="text-xs text-stone-500">{c.email}</p>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600">{new Date(c.last_booking).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-700">Rs. {c.total_spend.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        case 'resources':
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">Resources</h2>
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
                        <p className="text-stone-500">Coming soon: Resources and guides for Gurubas.</p>
                    </div>
                </div>
            );
        case 'profile':
            return (
                 <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-stone-900">My Guruba Profile</h2>
                     <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                               <label className="block text-sm font-bold text-stone-900 mb-2">Bio / Introduction</label>
                               <textarea
                                   className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                                   rows={4}
                                   value={bio}
                                   onChange={(e) => setBio(e.target.value)}
                                   placeholder="Tell clients about your experience, lineage, and approach..."
                               />
                            </div>
                            <GotraSelect value={gotraId} onChange={setGotraId} />
                            <div>
                               <label className="block text-sm font-bold text-stone-900 mb-2">Guruba Type</label>
                               <select
                                   className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 p-3 border"
                                   value={gurubaType}
                                   onChange={(e) => setGurubaType(e.target.value as any)}
                               >
                                   <option value="brahmin">Brahmin</option>
                                   <option value="non_brahmin">Non-Brahmin</option>
                                   <option value="astrologer">Astrologer</option>
                               </select>
                            </div>
                         </div>
                         <div className="flex justify-end mt-6">
                            <Button onClick={saveProfile} isLoading={savingProfile}>
                                <Save className="h-4 w-4 mr-2" /> Save Profile
                            </Button>
                         </div>
                     </div>
                 </div>
            );
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
                            <p className="text-xs text-stone-500 truncate font-medium">Guruba</p>
                        </div>
                    )}
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} isCollapsed={isSidebarCollapsed}/>
                <SidebarItem icon={ListChecks} label="Booking Requests" active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} badge={pendingCount || null} isCollapsed={isSidebarCollapsed} />
                <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} isCollapsed={isSidebarCollapsed}/>
                <SidebarItem icon={Calendar} label="Availability" active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} isCollapsed={isSidebarCollapsed}/>
                <SidebarItem icon={Briefcase} label="My Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} isCollapsed={isSidebarCollapsed}/>
                <SidebarItem icon={Users} label="My Clients" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} isCollapsed={isSidebarCollapsed}/>
                <SidebarItem icon={BookOpen} label="Resources" active={activeTab === 'resources'} onClick={() => handleTabChange('resources')} isCollapsed={isSidebarCollapsed}/>
                {!isSidebarCollapsed && <div className="my-4 h-px bg-stone-100 mx-2" />}
                <SidebarItem icon={User} label="My Profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} isCollapsed={isSidebarCollapsed}/>
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
    </div>
  );
};
