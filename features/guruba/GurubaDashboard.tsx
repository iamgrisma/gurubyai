
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Availability, Booking, Guruba } from '../../types';
import { 
    Calendar, Clock, DollarSign, MapPin, Star, Zap, RefreshCw, AlertCircle, Save, Check, 
    LayoutDashboard, ListChecks, User, LogOut, XCircle, CheckCircle, Settings
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        active ? 'bg-saffron-50 text-saffron-700' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${active ? 'text-saffron-600' : 'text-stone-400'}`} />
        {label}
      </div>
      {badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
);

export const GurubaDashboard: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'schedule' | 'profile'>('overview');
  
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
        // 1. Get Guruba Profile
        let { data: gurubaData, error: gurubaError } = await supabase
            .from('gurubas')
            .select('*')
            .eq('user_id', user?.id)
            .maybeSingle(); // Use maybeSingle to avoid error on 0 rows immediately

        // Auto-provision if missing
        if (!gurubaData && (!gurubaError || gurubaError.code === 'PGRST116')) {
             const { data: newGuruba, error: createError } = await supabase
                .from('gurubas')
                .insert([{ user_id: user?.id }])
                .select()
                .single();
             
             if (createError) throw createError;
             gurubaData = newGuruba;
             gurubaError = null;
        }

        if (gurubaError) throw new Error("Could not find Guruba profile.");
        
        setGuruba(gurubaData);
        setBio(gurubaData.bio || '');
        setSpecialties(gurubaData.specialties?.join(', ') || '');

        // 2. Get Bookings
        const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                services:service_id (title, base_price, duration_minutes),
                profiles:user_id (full_name, phone, email)
            `)
            .eq('guruba_id', gurubaData.id)
            .order('scheduled_at', { ascending: true });
        
        if (bookingError) throw bookingError;
        setBookings(bookingData || []);

        // 3. Get Availability
        const { data: availData, error: availError } = await supabase
            .from('guruba_availability')
            .select('*')
            .eq('guruba_id', gurubaData.id);
        
        if (availError) throw availError;
        setAvailability(availData || []);
        
        // Init Schedule Form
        const initialSchedule: any = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availData?.find(a => a.day_of_week === index);
            initialSchedule[index] = found 
                ? { start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: true }
                : { start: '09:00', end: '17:00', enabled: false };
        });
        setSchedule(initialSchedule);

    } catch (e: any) {
        console.error("Error:", e);
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled' | 'completed') => {
      try {
          const { error } = await supabase
            .from('bookings')
            .update({ status: action })
            .eq('id', bookingId);
        
          if (error) throw error;
          
          // Update local state
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action } : b));
      } catch (e) {
          alert("Failed to update booking status");
      }
  };

  const saveSchedule = async () => {
      if (!guruba) return;
      setSavingSchedule(true);
      try {
          const { error: delErr } = await supabase.from('guruba_availability').delete().eq('guruba_id', guruba.id);
          if (delErr) throw delErr;

          const rows = Object.entries(schedule)
            .filter(([_, val]) => val.enabled)
            .map(([day, val]) => ({
                guruba_id: guruba.id,
                day_of_week: parseInt(day),
                start_time: val.start,
                end_time: val.end
            }));

          if (rows.length > 0) {
              const { error: insErr } = await supabase.from('guruba_availability').insert(rows);
              if (insErr) throw insErr;
          }
          alert("Schedule updated!");
      } catch (e) {
          alert("Failed to save schedule");
      } finally {
          setSavingSchedule(false);
      }
  };

  const saveProfile = async () => {
      if (!guruba) return;
      setSavingProfile(true);
      try {
          const specsArray = specialties.split(',').map(s => s.trim()).filter(s => s);
          const { error } = await supabase
            .from('gurubas')
            .update({ bio, specialties: specsArray })
            .eq('id', guruba.id);
          
          if (error) throw error;
          alert("Profile updated!");
      } catch (e) {
          alert("Failed to update profile");
      } finally {
          setSavingProfile(false);
      }
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const earnings = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0);

  // Render Content
  const renderContent = () => {
      switch(activeTab) {
          case 'overview':
              return (
                  <div className="space-y-6">
                      {/* Verification Banner */}
                      {!guruba?.is_verified && (
                          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3 text-yellow-800">
                              <AlertCircle className="h-5 w-5" />
                              <div className="flex-1">
                                  <p className="font-bold text-sm">Verification Pending</p>
                                  <p className="text-xs mt-1">Complete your profile to get verified and attract more clients. Upload your certificates in settings.</p>
                              </div>
                              <Button size="sm" variant="outline" className="bg-white border-yellow-300 text-yellow-900 hover:bg-yellow-100">Verify Now</Button>
                          </div>
                      )}

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Total Earnings</h3>
                              <div className="text-3xl font-bold text-stone-900">${earnings}</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Rating</h3>
                              <div className="flex items-center gap-2">
                                  <span className="text-3xl font-bold text-stone-900">{guruba?.rating || 5.0}</span>
                                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Completed</h3>
                              <div className="text-3xl font-bold text-stone-900">{bookings.filter(b => b.status === 'completed').length}</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium mb-2">Pending Requests</h3>
                              <div className="text-3xl font-bold text-saffron-600">{pendingCount}</div>
                          </div>
                      </div>

                      {/* Today's Schedule */}
                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                          <h3 className="font-bold text-stone-900 mb-4">Upcoming Confirmed Rituals</h3>
                          <div className="space-y-4">
                              {bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                                  <p className="text-stone-500 text-center py-8">No confirmed rituals coming up.</p>
                              ) : (
                                  bookings.filter(b => b.status === 'confirmed').slice(0, 5).map(b => (
                                      <div key={b.id} className="flex items-center justify-between p-4 border border-stone-100 rounded-lg hover:bg-stone-50">
                                          <div className="flex items-center gap-4">
                                              <div className="h-12 w-12 bg-saffron-100 rounded-lg flex flex-col items-center justify-center text-saffron-700">
                                                  <span className="text-xs font-bold">{new Date(b.scheduled_at).toLocaleString('default', {month: 'short'})}</span>
                                                  <span className="text-lg font-bold">{new Date(b.scheduled_at).getDate()}</span>
                                              </div>
                                              <div>
                                                  <h4 className="font-bold text-stone-900">{b.services?.title}</h4>
                                                  <p className="text-sm text-stone-500 flex items-center gap-2">
                                                      <Clock className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                                      <span className="mx-1">•</span>
                                                      <User className="h-3 w-3" /> {b.profiles?.full_name}
                                                  </p>
                                              </div>
                                          </div>
                                          <Button size="sm" variant="outline" onClick={() => handleBookingAction(b.id, 'completed')}>
                                              Mark Completed
                                          </Button>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              );

          case 'requests':
              return (
                  <div className="space-y-6">
                      <h2 className="text-xl font-bold text-stone-900">Booking Requests</h2>
                      {bookings.filter(b => b.status === 'pending').length === 0 ? (
                          <div className="bg-stone-50 rounded-xl p-12 text-center border border-stone-200 border-dashed">
                              <p className="text-stone-500">No pending requests at the moment.</p>
                          </div>
                      ) : (
                          <div className="grid gap-4">
                              {bookings.filter(b => b.status === 'pending').map(b => (
                                  <div key={b.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                                      <div className="flex flex-col md:flex-row justify-between gap-6">
                                          <div>
                                              <div className="flex items-center gap-2 mb-2">
                                                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">New Request</span>
                                                  <span className="text-xs text-stone-400">{new Date(b.scheduled_at).toLocaleDateString()}</span>
                                              </div>
                                              <h3 className="text-lg font-bold text-stone-900">{b.services?.title}</h3>
                                              <div className="mt-2 space-y-1">
                                                  <p className="text-sm text-stone-600 flex items-center gap-2">
                                                      <User className="h-4 w-4" /> Client: <span className="font-medium">{b.profiles?.full_name}</span>
                                                  </p>
                                                  <p className="text-sm text-stone-600 flex items-center gap-2">
                                                      <Clock className="h-4 w-4" /> Time: <span className="font-medium">{new Date(b.scheduled_at).toLocaleTimeString()} ({b.services?.duration_minutes} mins)</span>
                                                  </p>
                                                  <p className="text-sm text-stone-600 flex items-center gap-2">
                                                      <DollarSign className="h-4 w-4" /> Payout: <span className="font-medium text-green-600">${b.services?.base_price}</span>
                                                  </p>
                                              </div>
                                          </div>
                                          <div className="flex flex-col justify-center gap-3 min-w-[140px]">
                                              <Button onClick={() => handleBookingAction(b.id, 'confirmed')} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                  <CheckCircle className="h-4 w-4 mr-2" /> Accept
                                              </Button>
                                              <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full border-red-200 text-red-600 hover:bg-red-50">
                                                  <XCircle className="h-4 w-4 mr-2" /> Decline
                                              </Button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              );

          case 'schedule':
              return (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-stone-900">Weekly Availability</h2>
                          <Button onClick={saveSchedule} isLoading={savingSchedule} size="sm" className="gap-2">
                              <Save className="h-4 w-4" /> Save Schedule
                          </Button>
                      </div>
                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
                          {DAYS_OF_WEEK.map((day, idx) => (
                              <div key={day} className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50">
                                  <div className="flex items-center gap-4">
                                      <input 
                                          type="checkbox" 
                                          checked={schedule[idx]?.enabled || false}
                                          onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], enabled: e.target.checked }})}
                                          className="h-5 w-5 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"
                                      />
                                      <span className={`font-medium ${schedule[idx]?.enabled ? 'text-stone-900' : 'text-stone-400'}`}>{day}</span>
                                  </div>
                                  {schedule[idx]?.enabled ? (
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="time" 
                                              value={schedule[idx]?.start}
                                              onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], start: e.target.value }})}
                                              className="text-sm border-stone-200 rounded-md"
                                          />
                                          <span className="text-stone-400">to</span>
                                          <input 
                                              type="time" 
                                              value={schedule[idx]?.end}
                                              onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], end: e.target.value }})}
                                              className="text-sm border-stone-200 rounded-md"
                                          />
                                      </div>
                                  ) : (
                                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded">Unavailable</span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              );
            
          case 'profile':
              return (
                  <div className="max-w-2xl space-y-6">
                      <h2 className="text-xl font-bold text-stone-900">Guruba Profile Settings</h2>
                      
                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-stone-700 mb-1">Bio / About Me</label>
                                  <textarea 
                                      value={bio}
                                      onChange={(e) => setBio(e.target.value)}
                                      rows={4}
                                      className="w-full rounded-lg border-stone-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 text-sm"
                                      placeholder="Tell clients about your lineage and experience..."
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-stone-700 mb-1">Specialties (comma separated)</label>
                                  <input 
                                      type="text" 
                                      value={specialties}
                                      onChange={(e) => setSpecialties(e.target.value)}
                                      className="w-full rounded-lg border-stone-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500 text-sm"
                                      placeholder="e.g. Vivah Sanskar, Griha Pravesh, Astrology"
                                  />
                              </div>
                              <div className="pt-4">
                                  <Button onClick={saveProfile} isLoading={savingProfile}>Update Profile</Button>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                          <h3 className="font-medium text-stone-900 mb-4">Verification Status</h3>
                          <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${guruba?.is_verified ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                                  <CheckCircle className="h-6 w-6" />
                              </div>
                              <div>
                                  <p className="font-bold">{guruba?.is_verified ? 'Verified Guruba' : 'Unverified'}</p>
                                  <p className="text-sm text-stone-500">{guruba?.is_verified ? 'You have the verified badge.' : 'Please contact admin to verify documents.'}</p>
                              </div>
                          </div>
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
                    <div className="h-10 w-10 rounded-full bg-saffron-500 text-white flex items-center justify-center font-bold">
                        {profile?.full_name?.[0] || 'G'}
                    </div>
                    <div>
                        <p className="font-bold text-stone-900 text-sm">{profile?.full_name}</p>
                        <p className="text-xs text-stone-500">Guruba Partner</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 p-4">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <SidebarItem icon={ListChecks} label="Requests" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} badge={pendingCount > 0 ? pendingCount : null} />
                <SidebarItem icon={Calendar} label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                <SidebarItem icon={Settings} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </nav>
            <div className="p-4 border-t border-stone-100">
                <button onClick={() => signOut().then(() => window.location.reload())} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    <LogOut className="h-4 w-4" /> Sign Out
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-4rem)]">
            {loading ? (
                <div className="flex items-center justify-center h-full text-saffron-600">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
            ) : error ? (
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
            ) : (
                renderContent()
            )}
        </main>
    </div>
  );
};
