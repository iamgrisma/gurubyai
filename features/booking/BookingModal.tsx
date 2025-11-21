
// features/booking/BookingModal.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba, SavedLocation } from '../../types';
import { Button } from '../../components/ui/Button';
import { useProfile, useBookService } from '../../hooks/queries';
import { Calendar, Clock, AlertTriangle, X, MapPin, CreditCard, Wallet, Navigation, Info } from 'lucide-react';
import { LocationPicker } from '../../components/ui/LocationPicker';
import { useQuery } from '@tanstack/react-query';

// Haversine Formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2-lat1); 
  const dLon = deg2rad(lon2-lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}

interface BookingModalProps {
  service: Service;
  guruba: Guruba;
  initialDate?: string;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ service, guruba, initialDate, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Hooks
  const { data: profile } = useProfile(user?.id);
  const bookService = useBookService();

  // State
  const [date, setDate] = useState(initialDate || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Details/Time, 2: Location/Confirm
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [gotraOverride, setGotraOverride] = useState(false);
  
  const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
  const [distanceWarning, setDistanceWarning] = useState<string | null>(null);

  // Fetch Saved Locations for Dropdown
  const { data: savedLocations = [] } = useQuery({
      queryKey: ['savedLocations', user?.id],
      queryFn: async () => {
          if (!user?.id) return [];
          const { data } = await supabase.from('saved_locations').select('*').eq('user_id', user.id).order('created_at');
          return data as SavedLocation[];
      },
      enabled: !!user?.id
  });

  // Load user's profile location as default
  useEffect(() => {
      if (profile?.latitude && profile?.longitude) {
          setLocation({
              lat: profile.latitude,
              lng: profile.longitude,
              address: profile.address || ''
          });
      }
  }, [profile]);

  // Calculate Distance Effect
  useEffect(() => {
      if (location.lat && guruba.profiles?.latitude && guruba.profiles?.longitude && !service.is_online_enabled) {
          const dist = getDistanceFromLatLonInKm(location.lat, location.lng, guruba.profiles.latitude, guruba.profiles.longitude);
          if (dist > 10) {
              setDistanceWarning(`Distance Warning: The selected location is ${dist.toFixed(1)}km away from the Guruba. This exceeds the recommended 10km range.`);
          } else {
              setDistanceWarning(null);
          }
      }
  }, [location, guruba, service]);

  // Constants
  const PLATFORM_FEE = 0; // Free for now
  const userCredits = profile?.credits || 0;
  const hasEnoughCredits = userCredits >= PLATFORM_FEE;

  // Derived Data
  const userGotra = profile?.gotra_id;
  const gurubaGotra = guruba.profiles?.gotra_id;

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

        const { data: availData } = await supabase
            .from('guruba_availability')
            .select('*')
            .eq('guruba_id', guruba.id)
            .eq('day_of_week', dayOfWeek)
            .single();
        
        if (!availData) {
            setLoadingSlots(false);
            return; 
        }

        const startOfDay = new Date(selectedDateStr);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(selectedDateStr);
        endOfDay.setHours(23,59,59,999);

        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('scheduled_at, service_id, services(duration_minutes)')
            .eq('guruba_id', guruba.id)
            .gte('scheduled_at', startOfDay.toISOString())
            .lte('scheduled_at', endOfDay.toISOString())
            .neq('status', 'cancelled');

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
    if (!hasEnoughCredits) return;

    setError(null);

    const scheduledAt = new Date(`${date}T${selectedTime}`).toISOString();

    try {
      await bookService.mutateAsync({
        user_id: user.id,
        guruba_id: guruba.id,
        service_id: service.id,
        scheduled_at: scheduledAt,
        platform_fee: PLATFORM_FEE,
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: location.address
      });

      onClose();
      navigate('/booking-success');
    } catch (err: any) {
      setError(err.message || "Failed to book service");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <h2 className="text-xl font-bold text-stone-900">
              {bookingStep === 1 ? "Select Time" : "Confirm Details"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
            {bookingStep === 1 ? (
                // STEP 1: Time & Basic Info
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                            <img src={service.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-stone-900">{service.title}</h4>
                            <p className="text-sm text-stone-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" /> {service.duration_minutes} mins
                            </p>
                        </div>
                    </div>

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

                    {isGotraConflict && (
                        <div className="rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold">Gotra Conflict Detected</p>
                                    <p className="mt-1 text-xs leading-relaxed">
                                        You and Guruba {guruba.profiles?.full_name} both belong to the <strong>{userGotra}</strong> Gotra.
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
                                    I accept this match (e.g. booking for someone else).
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // STEP 2: Location & Payment
                <div className="flex flex-col gap-6">
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-stone-500">Service:</span>
                            <span className="font-bold">{service.title}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span className="text-stone-500">Time:</span>
                            <span className="font-bold">{new Date(date).toLocaleDateString()} at {selectedTime}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Guruba:</span>
                            <span className="font-bold">{guruba.profiles?.full_name}</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-stone-900">Ritual Location</label>
                            {savedLocations.length > 0 && (
                                <select 
                                    className="text-xs border border-stone-300 rounded p-1 bg-white"
                                    onChange={(e) => {
                                        const loc = savedLocations.find(l => l.id === e.target.value);
                                        if (loc) setLocation({ lat: loc.latitude, lng: loc.longitude, address: loc.address || '' });
                                    }}
                                >
                                    <option value="">Load Saved Location...</option>
                                    {savedLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            )}
                        </div>
                        
                        <LocationPicker 
                            initialLocation={location.lat ? location : undefined}
                            onLocationSelect={setLocation}
                        />
                        
                        {distanceWarning && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 animate-in fade-in">
                                <Navigation className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{distanceWarning}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-stone-100 pt-4">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-stone-500 flex items-center gap-2"><Wallet className="h-4 w-4" /> Balance</span>
                             <span className={`font-bold ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}>{userCredits} CR</span>
                        </div>
                        <div className="flex justify-between items-center">
                             <span className="text-stone-900 font-bold">Platform Fee</span>
                             <span className="font-bold">{PLATFORM_FEE} CR</span>
                        </div>
                        {!hasEnoughCredits && <p className="text-xs text-red-500 mt-1">Insufficient credits to book.</p>}
                    </div>
                </div>
            )}
        </div>

        <div className="bg-stone-50 p-6 border-t border-stone-200 flex justify-end gap-3 shrink-0">
            {bookingStep === 1 ? (
                <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        disabled={!selectedTime || (isGotraConflict && !gotraOverride)} 
                        onClick={() => setBookingStep(2)}
                    >
                        Next: Location
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setBookingStep(1)}>Back</Button>
                    <Button 
                        onClick={handleSubmit}
                        isLoading={bookService.isPending}
                        disabled={!hasEnoughCredits || !location.lat}
                        className="px-8 gap-2"
                    >
                        <CreditCard className="h-4 w-4" />
                        Confirm Booking
                    </Button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
