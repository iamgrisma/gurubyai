
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Availability, Booking, Guruba } from '../../types';
import { ChatInterface } from '../messages/ChatInterface';
import { 
    Calendar, Clock, DollarSign, MapPin, Star, Zap, RefreshCw, AlertCircle, Save, Check, 
    LayoutDashboard, ListChecks, User, LogOut, XCircle, CheckCircle, Settings, MessageSquare, BarChart3
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

export const GurubaDashboard: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'messages' | 'schedule' | 'profile'>('overview');
  
  const [guruba, setGuruba] = useState<Guruba | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Schedule Edit State
  const [schedule, setSchedule] = useState<{ [key: number]: { start: string, end: string, enabled: boolean } }>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Profile Edit
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string>('');
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
        let { data: gurubaRows, error: gurubaError } = await supabase
            .from('gurubas')
            .select('*')
            .eq('user_id', user?.id);
            
        let gurubaData = gurubaRows?.[0];

        // Auto-provision
        if ((!gurubaRows || gurubaRows.length === 0) && !gurubaError) {
             const { data: newGuruba, error: createError } = await supabase.from('gurubas').insert([{ user_id: user?.id }]).select().single();
             if (createError && createError.code !== '23505') throw createError;
             if (createError && createError.code === '23505') {
                  const { data: retry } = await supabase.from('gurubas').select('*').eq('user_id', user?.id).single();
                  gurubaData = retry;
             } else {
                  gurubaData = newGuruba;
             }
        } else if (gurubaError) {
             throw gurubaError;
        }
        
        setGuruba(gurubaData);
        setBio(gurubaData.bio || '');
        setSpecialties(gurubaData.specialties?.join(', ') || '');

        // Get Bookings
        const { data: bookingData } = await supabase
            .from('bookings')
            .select(`*, services:service_id (title, base_price, duration_minutes), profiles:user_id (full_name, phone, email, avatar_url)`)
            .eq('guruba_id', gurubaData.id)
            .order('scheduled_at', { ascending: true });
        
        setBookings(bookingData || []);

        // Get Availability
        const { data: availData } = await supabase.from('guruba_availability').select('*').eq('guruba_id', gurubaData.id);
        
        setAvailability(availData || []);
        
        const initialSchedule: any = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availData?.find(a => a.day_of_week === index);
            initialSchedule[index] = found 
                ? { start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: true }
                : { start: '09:00', end: '17:00', enabled: false };
        });
        setSchedule(initialSchedule);

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

  const saveSchedule = async () => {
      if (!guruba) return;
      setSavingSchedule(true);
      try {
          await supabase.from('guruba_availability').delete().eq('guruba_id', guruba.id);
          const rows = Object.entries(schedule).filter(([_, val]) => val.enabled).map(([day, val]) => ({
                guruba_id: guruba.id,
                day_of_week: parseInt(day),
                start_time: val.start,
                end_time: val.end
            }));
          if (rows.length > 0) await supabase.from('guruba_availability').insert(rows);
          alert("Schedule updated!");
      } catch (e) { alert("Failed"); } finally { setSavingSchedule(false); }
  };

  const saveProfile = async () => {
      if (!guruba) return;
      setSavingProfile(true);
      try {
          await supabase.from('gurubas').update({ bio, specialties: specialties.split(',').map(s => s.trim()).filter(s => s) }).eq('id', guruba.id);
          alert("Profile updated!");
      } catch (e) { alert("Failed"); } finally { setSavingProfile(false); }
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const earnings = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0);

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
                                  <p className="text-sm mt-1 opacity-90">Upload your identification and Vedic certificates to get the "Verified" badge and boost your bookings by 3x.</p>
                              </div>
                              <Button variant="outline" className="bg-white border-yellow-300 text-yellow-900 hover:bg-yellow-100 whitespace-nowrap">Start Verification</Button>
                          </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Total Earnings</h3>
                              <div className="text-3xl font-bold text-stone-900 flex items-center gap-1">
                                <DollarSign className="h-6 w-6 text-stone-400" /> {earnings}
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
                          {/* Upcoming Rituals */}
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

                          {/* Quick Earnings Chart Mock */}
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
                      {bookings.filter(b => b.status === 'pending').length === 0 ? (
                          <div className="bg-stone-50 rounded-2xl p-16 text-center border border-stone-200 border-dashed">
                              <ListChecks className="h-12 w-12 mx-auto text-stone-300 mb-4" />
                              <h3 className="text-lg font-medium text-stone-900">No Pending Requests</h3>
                              <p className="text-stone-500 mt-2">New booking requests from clients will appear here.</p>
                          </div>
                      ) : (
                          <div className="grid gap-6">
                              {bookings.filter(b => b.status === 'pending').map(b => (
                                  <div key={b.id} className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 hover:shadow-lg transition-shadow">
                                      <div className="flex flex-col md:flex-row justify-between gap-8">
                                          <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-4">
                                                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm shadow-blue-200">New Request</span>
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
                                                          <DollarSign className="h-4 w-4 text-green-600" /> Pays <span className="font-bold text-green-700">${b.services?.base_price}</span>
                                                      </p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                                              <Button onClick={() => handleBookingAction(b.id, 'confirmed')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base shadow-lg shadow-green-900/10">
                                                  <CheckCircle className="h-5 w-5 mr-2" /> Accept
                                              </Button>
                                              <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3">
                                                  <XCircle className="h-5 w-5 mr-2" /> Decline
                                              </Button>
                                          </div>
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
                      <div className="flex justify-between items-center">
                          <h2 className="text-2xl font-bold text-stone-900">Availability Settings</h2>
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
                                      <span className="text-sm font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full uppercase tracking-wide">Day Off</span>
                                  )}
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
                                      placeholder="Describe your lineage, vedic education, and approach to rituals..."
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-stone-900 mb-2">Specialties (comma separated)</label>
                                  <input 
                                      type="text" 
                                      value={specialties}
                                      onChange={(e) => setSpecialties(e.target.value)}
                                      className="w-full rounded-xl border-stone-200 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 text-base p-3"
                                      placeholder="e.g. Vivah Sanskar, Griha Pravesh, Astrology"
                                  />
                                  <p className="text-xs text-stone-500 mt-2">These tags help clients find you in search.</p>
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
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-stone-200 hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
            <div className="p-6 border-b border-stone-100">
                <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold shadow-md">
                        {profile?.full_name?.[0] || 'G'}
                    </div>
                    <div>
                        <p className="font-bold text-stone-900 text-sm">{profile?.full_name}</p>
                        <p className="text-xs text-stone-500 font-medium">Verified Guruba</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <SidebarItem icon={ListChecks} label="Requests" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} badge={pendingCount > 0 ? pendingCount : null} />
                <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
                <SidebarItem icon={Calendar} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                <div className="my-4 h-px bg-stone-100 mx-2" />
                <SidebarItem icon={Settings} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </nav>
            <div className="p-6">
                <button onClick={() => signOut().then(() => window.location.reload())} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
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