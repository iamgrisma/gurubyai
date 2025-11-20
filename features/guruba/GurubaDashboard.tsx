
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Availability } from '../../types';
import { Calendar, Clock, DollarSign, MapPin, Star, Zap, RefreshCw, AlertCircle, Save, Check } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const GurubaDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [gurubaId, setGurubaId] = useState<string | null>(null);
  const [rituals, setRituals] = useState<any[]>([]);
  const [stats, setStats] = useState({ earnings: 0, completed: 0, rating: 5.0 });
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Availability Edit State
  const [schedule, setSchedule] = useState<{ [key: number]: { start: string, end: string, enabled: boolean } }>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (user) {
        fetchGurubaData();
    }
  }, [user]);

  const fetchGurubaData = async () => {
    setLoading(true);
    setError(null);
    
    try {
        // 1. Get Guruba Details
        const { data: gurubaData, error: gurubaError } = await supabase
            .from('gurubas')
            .select('*')
            .eq('user_id', user?.id)
            .single();

        if (gurubaError) {
             throw new Error("Could not find Guruba profile details.");
        }
        
        setGurubaId(gurubaData.id);

        setStats(prev => ({
            ...prev,
            rating: gurubaData.rating || 5.0,
            earnings: 0,
            completed: 0
        }));

        // 2. Get Bookings for this Guruba
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                *,
                services:service_id (title, base_price),
                profiles:user_id (full_name, phone)
            `)
            .eq('guruba_id', gurubaData.id)
            .order('scheduled_at', { ascending: true });
        
        if (bookingsError) throw bookingsError;

        if (bookings) {
            setRituals(bookings);
            setStats(prev => ({ 
                ...prev, 
                completed: bookings.filter(b => b.status === 'completed').length,
                earnings: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0)
            }));
        }

        // 3. Get Availability
        const { data: availData, error: availError } = await supabase
            .from('guruba_availability')
            .select('*')
            .eq('guruba_id', gurubaData.id);
        
        if (availError) throw availError;
        setAvailability(availData || []);
        
        // Initialize Schedule Form
        const initialSchedule: any = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availData?.find(a => a.day_of_week === index);
            if (found) {
                initialSchedule[index] = { 
                    start: found.start_time.slice(0, 5), 
                    end: found.end_time.slice(0, 5), 
                    enabled: true 
                };
            } else {
                initialSchedule[index] = { start: '09:00', end: '17:00', enabled: false };
            }
        });
        setSchedule(initialSchedule);

    } catch (e: any) {
        console.error("Error loading guruba dash:", e);
        setError(e.message || "Failed to load dashboard data.");
    } finally {
        setLoading(false);
    }
  };

  const handleScheduleChange = (dayIndex: number, field: 'start' | 'end' | 'enabled', value: any) => {
    setSchedule(prev => ({
        ...prev,
        [dayIndex]: {
            ...prev[dayIndex],
            [field]: value
        }
    }));
  };

  const saveSchedule = async () => {
      if (!gurubaId) return;
      setSavingSchedule(true);
      setError(null);

      try {
          // Prepare upserts and deletes
          // Strategy: Delete all for this guruba and re-insert enabled ones. 
          // Simplest for full sync without diffing complexity.
          
          const { error: deleteError } = await supabase
            .from('guruba_availability')
            .delete()
            .eq('guruba_id', gurubaId);
          
          if (deleteError) throw deleteError;

          const newRows = Object.entries(schedule)
            .filter(([_, val]) => val.enabled)
            .map(([dayStr, val]) => ({
                guruba_id: gurubaId,
                day_of_week: parseInt(dayStr),
                start_time: val.start,
                end_time: val.end
            }));

          if (newRows.length > 0) {
              const { error: insertError } = await supabase
                .from('guruba_availability')
                .insert(newRows);
              
              if (insertError) throw insertError;
          }

          await fetchGurubaData(); // Refresh
          alert("Schedule updated successfully!");

      } catch (err: any) {
          console.error("Failed to save schedule", err);
          setError("Failed to save schedule updates.");
      } finally {
          setSavingSchedule(false);
      }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              Namaste, {profile?.full_name || 'Pandit Ji'}
            </h1>
            <p className="text-stone-600">Manage your rituals and availability.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchGurubaData} disabled={loading}>
                {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : 'Refresh'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800 border border-red-200 flex items-center gap-2">
             <AlertCircle className="h-5 w-5" />
             <span>{error}</span>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <DollarSign className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Total Earnings</p>
                <p className="text-2xl font-bold text-stone-900">${stats.earnings}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-600">
                <Calendar className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Completed Rituals</p>
                <p className="text-2xl font-bold text-stone-900">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                <Star className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Rating</p>
                <p className="text-2xl font-bold text-stone-900">{stats.rating}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
            {/* Left Column: Bookings */}
            <div className="md:col-span-7 space-y-6">
                <h2 className="text-lg font-bold text-stone-900">Upcoming Rituals</h2>
                {loading ? (
                    <div className="p-8 text-center bg-white rounded-lg border border-stone-200 text-stone-500">
                        Loading schedule...
                    </div>
                ) : rituals.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-lg border border-stone-200 text-stone-500">
                        No upcoming rituals found.
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
                        {rituals.map((ritual) => (
                            <div key={ritual.id} className="p-6 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-stone-900">{ritual.services?.title || 'Custom Service'}</h3>
                                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                        ritual.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {ritual.status}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 text-sm text-stone-600 mt-3">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-stone-400" />
                                        {new Date(ritual.scheduled_at).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-stone-400" />
                                        Client: {ritual.profiles?.full_name || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Column: Availability Settings */}
            <div className="md:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-stone-900">Manage Schedule</h3>
                        <Button size="sm" onClick={saveSchedule} isLoading={savingSchedule} className="gap-2">
                            <Save className="h-4 w-4" /> Save
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {DAYS_OF_WEEK.map((day, index) => (
                            <div key={day} className="flex items-center justify-between p-3 rounded-md border border-stone-100 bg-stone-50">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={schedule[index]?.enabled || false}
                                        onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                                        className="h-4 w-4 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"
                                    />
                                    <span className={`text-sm font-medium ${schedule[index]?.enabled ? 'text-stone-900' : 'text-stone-400'}`}>
                                        {day}
                                    </span>
                                </div>
                                
                                {schedule[index]?.enabled ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="time" 
                                            value={schedule[index]?.start || '09:00'}
                                            onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                                            className="text-xs rounded border-stone-200 py-1 px-2 w-20"
                                        />
                                        <span className="text-stone-400">-</span>
                                        <input 
                                            type="time" 
                                            value={schedule[index]?.end || '17:00'}
                                            onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                                            className="text-xs rounded border-stone-200 py-1 px-2 w-20"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs text-stone-400 px-2 py-1">Unavailable</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-stone-500 mt-4">
                        Uncheck a day to mark it as off. Set your start and end hours for available days.
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};