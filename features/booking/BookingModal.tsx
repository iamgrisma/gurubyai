
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, AlertTriangle, CheckCircle, X, MapPin, Info, CreditCard } from 'lucide-react';

interface BookingModalProps {
  service: Service;
  guruba: Guruba;
  initialDate?: string;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ service, guruba, initialDate, onClose }) => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [date, setDate] = useState(initialDate || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [gotraOverride, setGotraOverride] = useState(false);

  // Derived Data
  const userGotra = profile?.gotra_id;
  const gurubaGotra = guruba.profiles?.gotra_id;
  const PLATFORM_FEE = 100;

  const isNA = (g?: string) => !g || g.toLowerCase() === 'not applicable' || g.toLowerCase() === 'n/a';
  
  const isGotraConflict = 
    !isNA(userGotra) && 
    !isNA(gurubaGotra) && 
    userGotra?.toLowerCase() === gurubaGotra?.toLowerCase();

  useEffect(() => {
    if (date && guruba.id) {
        fetchAvailabilityForDate(date);
    } else {
        setAvailableSlots([]);
    }
  }, [date, guruba.id]);

  const fetchAvailabilityForDate = async (selectedDateStr: string) => {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTime('');
      
      try {
        const selectedDate = new Date(selectedDateStr);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday

        // 1. Fetch Guruba's configured schedule for this day of week
        const { data: availData, error: availError } = await supabase
            .from('guruba_availability')
            .select('*')
            .eq('guruba_id', guruba.id)
            .eq('day_of_week', dayOfWeek)
            .single();
        
        // If error or no data, it means not working this day
        if (!availData) {
            setLoadingSlots(false);
            return; 
        }

        // 2. Fetch existing bookings for this date to check conflicts
        const startOfDay = new Date(selectedDateStr);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(selectedDateStr);
        endOfDay.setHours(23,59,59,999);

        const { data: existingBookings, error: bookingError } = await supabase
            .from('bookings')
            .select('scheduled_at, service_id, services(duration_minutes)')
            .eq('guruba_id', guruba.id)
            .gte('scheduled_at', startOfDay.toISOString())
            .lte('scheduled_at', endOfDay.toISOString())
            .neq('status', 'cancelled');

        if (bookingError) throw bookingError;

        // 3. Generate Slots
        const slots: string[] = [];
        const toMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const workStart = toMinutes(availData.start_time);
        const workEnd = toMinutes(availData.end_time);
        const serviceDuration = service.duration_minutes;
        const step = 30; 

        const blockedRanges = existingBookings?.map((b: any) => {
            const bookingDate = new Date(b.scheduled_at);
            const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
            const duration = b.services?.duration_minutes || 60;
            return { start: startMins, end: startMins + duration };
        }) || [];

        for (let t = workStart; t + serviceDuration <= workEnd; t += step) {
            const slotStart = t;
            const slotEnd = t + serviceDuration;
            const isBlocked = blockedRanges.some(range => {
                return (slotStart < range.end && slotEnd > range.start);
            });

            if (!isBlocked) {
                const h = Math.floor(t / 60);
                const m = t % 60;
                const timeLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                slots.push(timeLabel);
            }
        }

        setAvailableSlots(slots);

      } catch (err) {
          console.error("Error calculating slots", err);
      } finally {
          setLoadingSlots(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTime) return;
    if (isGotraConflict && !gotraOverride) return;

    setLoading(true);
    setError(null);

    const scheduledAt = new Date(`${date}T${selectedTime}`).toISOString();

    try {
      const { error: dbError } = await supabase.from('bookings').insert({
        user_id: user.id,
        guruba_id: guruba.id,
        service_id: service.id,
        scheduled_at: scheduledAt,
        status: 'pending',
        platform_fee: PLATFORM_FEE
      });

      if (dbError) throw dbError;

      onClose();
      navigate('/booking-success');
    } catch (err: any) {
      setError(err.message || "Failed to book service");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <h2 className="text-xl font-bold text-stone-900">Confirm Your Booking</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
            <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">Service Details</h3>
                        <div className="flex gap-4">
                            <div className="h-20 w-20 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                                <img src={service.image_url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-stone-900">{service.title}</h4>
                                <p className="text-sm text-stone-500 line-clamp-2">{service.description}</p>
                                <div className="mt-1 flex items-center gap-4 text-sm font-medium text-stone-700">
                                    <span>{service.duration_minutes} mins</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">Selected Guruba</h3>
                        <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-100">
                            <div className="h-10 w-10 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold text-sm overflow-hidden">
                                {guruba.profiles?.avatar_url ? <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : (guruba.profiles?.full_name?.[0] || 'G')}
                            </div>
                            <div>
                                <p className="font-bold text-stone-900">{guruba.profiles?.full_name}</p>
                                <p className="text-xs text-stone-500 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" /> {guruba.location}
                                </p>
                                <p className="text-xs text-stone-400 mt-1">Gotra: {guruba.profiles?.gotra_id || 'Not Listed'}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Pricing Breakdown */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <h3 className="text-sm font-bold text-stone-900 mb-3">Payment Summary</h3>
                        <div className="space-y-2 text-sm">
                             <div className="flex justify-between text-stone-600">
                                 <span>Service Base Price</span>
                                 <span>Rs. {service.base_price}</span>
                             </div>
                             <div className="flex justify-between text-stone-900 font-medium">
                                 <span>Booking Platform Fee</span>
                                 <span>Rs. {PLATFORM_FEE}</span>
                             </div>
                             <div className="h-px bg-stone-200 my-2"></div>
                             <div className="flex justify-between text-lg font-bold text-stone-900">
                                 <span>Total Payable Now</span>
                                 <span>Rs. {PLATFORM_FEE}</span>
                             </div>
                             <div className="mt-3 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100 flex items-start gap-2">
                                 <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                 <p>
                                     <strong>Note:</strong> The Rs. {PLATFORM_FEE} is a fixed platform fee. 
                                     <br/>
                                     <strong>Guru Dakshina</strong> (Rs. {service.base_price} or voluntary amount) is paid directly to the Guruba after the service.
                                 </p>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 border-l border-stone-100 md:pl-8">
                    <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Gotra Check */}
                        {isGotraConflict ? (
                            <div className="rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-bold">Gotra Conflict Detected</p>
                                        <p className="mt-1 text-xs leading-relaxed">
                                            You and Guruba {guruba.profiles?.full_name} both belong to the <strong>{userGotra}</strong> Gotra. Traditionally, rituals are not performed between members of the same lineage.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-start gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="gotra-override"
                                        className="mt-0.5 h-4 w-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                                        checked={gotraOverride}
                                        onChange={e => setGotraOverride(e.target.checked)}
                                    />
                                    <label htmlFor="gotra-override" className="text-xs font-medium cursor-pointer select-none">
                                        I am booking on behalf of someone with a different Gotra, or I explicitly accept this match.
                                    </label>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100">
                                <CheckCircle className="h-3 w-3" />
                                <span>Gotra Compatibility Verified</span>
                             </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Select Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-md border border-stone-300 pl-9 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Available Time Slots</label>
                                {loadingSlots ? (
                                    <div className="text-sm text-stone-500 animate-pulse">Looking for open slots...</div>
                                ) : !date ? (
                                    <div className="text-sm text-stone-400 flex items-center gap-2">
                                        <Info className="h-4 w-4" /> Please select a date first.
                                    </div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                        No available slots on this date. Please try another day.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {availableSlots.map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setSelectedTime(slot)}
                                                className={`px-2 py-2 text-xs font-medium rounded-md border transition-all ${
                                                    selectedTime === slot 
                                                    ? 'bg-saffron-600 text-white border-saffron-600 ring-2 ring-saffron-200' 
                                                    : 'bg-white text-stone-700 border-stone-200 hover:border-saffron-400 hover:text-saffron-600'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </form>
                </div>
            </div>
        </div>

        <div className="bg-stone-50 p-6 border-t border-stone-200 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
                type="submit" 
                form="booking-form"
                isLoading={loading}
                disabled={(isGotraConflict && !gotraOverride) || !selectedTime}
                className="px-8 gap-2"
            >
                <CreditCard className="h-4 w-4" />
                Pay Rs. {PLATFORM_FEE} & Book
            </Button>
        </div>
      </div>
    </div>
  );
};
