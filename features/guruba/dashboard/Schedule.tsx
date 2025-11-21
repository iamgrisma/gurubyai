
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Availability, Guruba } from '../../../types';
import { Save, Clock, X, CheckCircle2, Power } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleProps {
  guruba: Guruba | null;
}

interface DaySchedule {
    start: string;
    end: string;
    enabled: boolean;
}

type WeeklySchedule = {
    [key: number]: DaySchedule;
}

export const GurubaSchedule: React.FC<ScheduleProps> = ({ guruba }) => {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch Availability
  const { data: availability = [] } = useQuery({
      queryKey: ['availability', guruba?.id],
      queryFn: async () => {
          if (!guruba?.id) return [];
          const { data } = await supabase.from('guruba_availability').select('*').eq('guruba_id', guruba.id);
          return (data || []) as Availability[];
      },
      enabled: !!guruba?.id
  });

  // Sync Schedule state with fetched data
  useEffect(() => {
    if (availability) {
        const initialSchedule: WeeklySchedule = {};
        DAYS_OF_WEEK.forEach((_, index) => {
            const found = availability.find(a => a.day_of_week === index);
            initialSchedule[index] = found 
                ? { start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: true }
                : { start: '05:00', end: '21:00', enabled: false }; // Default: 5 AM - 9 PM, Disabled
        });
        setSchedule(initialSchedule);
    }
  }, [availability]);

  const saveSchedule = async () => {
    if (!guruba) return;
    
    // 1. Validation: Check if End Time > Start Time for enabled days
    const invalidDays = Object.entries(schedule)
        .filter(([, val]) => val.enabled && val.start >= val.end)
        .map(([day]) => DAYS_OF_WEEK[parseInt(day)]);

    if (invalidDays.length > 0) {
        alert(`Invalid Schedule: End time must be after start time for ${invalidDays.join(', ')}.`);
        return;
    }

    setSavingSchedule(true);
    try {
        // 2. Prepare Data
        const upsertRows = Object.entries(schedule)
            .filter(([, val]) => val.enabled)
            .map(([day, val]) => ({
                guruba_id: guruba.id,
                day_of_week: parseInt(day),
                start_time: val.start,
                end_time: val.end,
            }));

        const deleteDays = Object.entries(schedule)
            .filter(([, val]) => !val.enabled)
            .map(([day]) => parseInt(day));

        // 3. Perform DB Operations
        // Delete disabled days
        if (deleteDays.length > 0) {
            const { error: deleteError } = await supabase
                .from('guruba_availability')
                .delete()
                .eq('guruba_id', guruba.id)
                .in('day_of_week', deleteDays);
            if (deleteError) throw deleteError;
        }

        // Upsert enabled days
        if (upsertRows.length > 0) {
            const { error: upsertError } = await supabase
                .from('guruba_availability')
                .upsert(upsertRows, { onConflict: 'guruba_id, day_of_week' });
            if (upsertError) throw upsertError;
        }
        
        // 4. Refresh UI
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        alert("Schedule updated successfully!");
    } catch (e: any) { 
        console.error(e);
        alert(`Failed to update schedule: ${e.message}`);
    } finally { 
        setSavingSchedule(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-saffron-600" />
                    Weekly Availability
                </h2>
                <p className="text-stone-500 mt-1 text-sm">
                    Set the days and hours you are available for bookings. Clients can only book you during these times.
                </p>
            </div>
            <Button onClick={saveSchedule} isLoading={savingSchedule} className="gap-2 w-full md:w-auto shadow-md">
                <Save className="h-4 w-4" /> Save Changes
            </Button>
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DAYS_OF_WEEK.map((day, idx) => (
                <div 
                    key={day} 
                    className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-4 ${
                        schedule[idx]?.enabled 
                        ? 'bg-white border-saffron-200 shadow-lg shadow-saffron-500/5 ring-1 ring-saffron-100' 
                        : 'bg-stone-50 border-stone-100 opacity-90'
                    }`}
                >
                    {/* Card Header with Toggle */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-1">
                        <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${schedule[idx]?.enabled ? 'text-stone-900' : 'text-stone-400'}`}>
                                {day}
                            </span>
                        </div>
                        
                        {/* Modern Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={schedule[idx]?.enabled || false}
                                onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], enabled: e.target.checked }})}
                            />
                            <div className="w-12 h-7 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-saffron-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-saffron-600 shadow-inner"></div>
                        </label>
                    </div>

                    {/* Card Content */}
                    {schedule[idx]?.enabled ? (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block tracking-wider">Start Time</label>
                                    <div className="relative">
                                        <input 
                                            type="time" 
                                            value={schedule[idx]?.start}
                                            onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], start: e.target.value }})}
                                            className="block w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block tracking-wider">End Time</label>
                                    <div className="relative">
                                        <input 
                                            type="time" 
                                            value={schedule[idx]?.end}
                                            onChange={(e) => setSchedule({...schedule, [idx]: { ...schedule[idx], end: e.target.value }})}
                                            className="block w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center pt-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                    <CheckCircle2 className="h-3 w-3" /> Available
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-stone-100/50 rounded-xl border border-dashed border-stone-200">
                            <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center mb-2 text-stone-400">
                                <Power className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Not Available</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};