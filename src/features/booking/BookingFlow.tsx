"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba, SavedLocation } from '../../types';
import { useBookService, useProfile, useGurubas } from '../../hooks/queries';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { LocationPicker } from '../../components/ui/DynamicLocationPicker';
import {
    Calendar as CalendarIcon,
    Clock,
    AlertTriangle,
    CreditCard,
    Wallet,
    Navigation,
    Info,
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    Star,
    MapPin
} from 'lucide-react';
import { PLATFORM_FEE, MAX_RECOMMENDED_DISTANCE } from '../../lib/constants';
import { useMessage } from '../../components/ui/MessageContext';

interface BookingFlowProps {
    service: Service;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({ service }) => {
    const { user } = useAuth();
    const router = useRouter();
    const { showMessage } = useMessage();
    const searchParams = useSearchParams();
    
    const preselectedGurubaId = searchParams.get('gurubaId');

    const { data: profile } = useProfile(user?.id);
    const { data: allGurubas = [], isLoading: gurubasLoading } = useGurubas();
    const bookService = useBookService();

    // Query Gurubas offering this service from guruba_services table
    const { data: offeredGurubaServices = [], isLoading: offeredLoading } = useQuery({
        queryKey: ['offeredGurubaServices', service.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('guruba_services')
                .select(`
                    *,
                    gurubas (
                        *,
                        profiles:user_id (
                            id,
                            full_name,
                            gotra_id,
                            avatar_url,
                            latitude,
                            longitude
                        )
                    )
                `)
                .eq('service_id', service.id);
            if (error) throw error;
            return data || [];
        }
    });

    // Steps
    const [step, setStep] = useState<number>(preselectedGurubaId ? 2 : 1);
    
    // Step 1 State
    const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);

    // Step 2 State
    const [date, setDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [proposeTime, setProposeTime] = useState(false);
    const [bookingOnline, setBookingOnline] = useState(false);
    const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
    const [customMessage, setCustomMessage] = useState('');
    const [gotraOverride, setGotraOverride] = useState(false);
    
    // Geospatial Distance States
    const [roadDistance, setRoadDistance] = useState<number | null>(null);
    const [distanceLoading, setDistanceLoading] = useState(false);

    // Derived values for custom pricing and online capabilities
    const selectedGurubaService = selectedGuruba ? offeredGurubaServices.find(ogs => ogs.guruba_id === selectedGuruba.id) : null;
    const actualPrice = selectedGurubaService?.custom_price ? Number(selectedGurubaService.custom_price) : service.base_price;
    const isOnlineAvailable = service.is_online_enabled && selectedGurubaService?.is_online;

    useEffect(() => {
        if (preselectedGurubaId && allGurubas.length > 0 && !selectedGuruba) {
            const found = allGurubas.find(g => g.id === preselectedGurubaId);
            if (found) setSelectedGuruba(found);
        }
    }, [preselectedGurubaId, allGurubas]);

    useEffect(() => {
        if (profile?.latitude && profile?.longitude) {
            setLocation({
                lat: profile.latitude,
                lng: profile.longitude,
                address: profile.address || '',
            });
        }
    }, [profile]);

    const userGotra = profile?.gotra_id;
    const gurubaGotra = selectedGuruba?.profiles?.gotra_id;
    const isNA = (g?: string) => !g || g.toLowerCase() === 'not applicable' || g.toLowerCase() === 'n/a';
    const isGotraConflict = !isNA(userGotra) && !isNA(gurubaGotra) && userGotra?.toLowerCase() === gurubaGotra?.toLowerCase();

    // Distance Calculation Effect (OSRM API + Haversine Fallback)
    useEffect(() => {
        if (bookingOnline || !location.lat || !selectedGuruba?.profiles?.latitude || !selectedGuruba?.profiles?.longitude) {
            setRoadDistance(null);
            return;
        }

        const fetchDistance = async () => {
            setDistanceLoading(true);
            try {
                const lon1 = location.lng;
                const lat1 = location.lat;
                const lon2 = selectedGuruba.profiles!.longitude!;
                const lat2 = selectedGuruba.profiles!.latitude!;
                
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
                if (!response.ok) throw new Error('OSRM API failed');
                
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    // Distance is returned in meters, convert to km
                    setRoadDistance(data.routes[0].distance / 1000);
                } else {
                    throw new Error('No routes found');
                }
            } catch (err) {
                console.warn('Falling back to Haversine straight-line distance:', err);
                const R = 6371; // Radius of the earth in km
                const dLat = (selectedGuruba.profiles!.latitude! - location.lat) * (Math.PI / 180);
                const dLon = (selectedGuruba.profiles!.longitude! - location.lng) * (Math.PI / 180);
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(location.lat * (Math.PI / 180)) * Math.cos(selectedGuruba.profiles!.latitude! * (Math.PI / 180)) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2); 
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                setRoadDistance(R * c);
            } finally {
                setDistanceLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchDistance, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [location.lat, location.lng, selectedGuruba?.profiles?.latitude, selectedGuruba?.profiles?.longitude, bookingOnline]);

    // Fetch slots when date or guruba changes
    useEffect(() => {
        if (date && selectedGuruba?.id) {
            fetchAvailabilityForDate(date);
        } else {
            setAvailableSlots([]);
        }
    }, [date, selectedGuruba?.id]);

    const fetchAvailabilityForDate = async (selectedDateStr: string) => {
        if (!selectedGuruba) return;
        setLoadingSlots(true);
        setAvailableSlots([]);
        setSelectedTime('');
        try {
            const selectedDate = new Date(selectedDateStr);
            const dayOfWeek = selectedDate.getDay();

            const { data: availData } = await supabase
                .from('guruba_availability')
                .select('*')
                .eq('guruba_id', selectedGuruba.id)
                .eq('day_of_week', dayOfWeek)
                .maybeSingle(); 

            if (!availData) {
                setLoadingSlots(false);
                return;
            }

            const [y, m, d] = selectedDateStr.split('-').map(Number);
            const startOfDay = new Date(y, m - 1, d);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(y, m - 1, d);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: existingBookings } = await supabase
                .from('bookings')
                .select('scheduled_at, services(duration_minutes)')
                .eq('guruba_id', selectedGuruba.id)
                .gte('scheduled_at', startOfDay.toISOString())
                .lte('scheduled_at', endOfDay.toISOString())
                .in('status', ['pending', 'confirmed', 'awaiting_client_confirmation']);

            const toMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
            };

            const workStart = toMinutes(availData.start_time);
            const workEnd = toMinutes(availData.end_time);
            const serviceDuration = service.duration_minutes;
            const buffer = 30;
            const slotStep = serviceDuration + buffer;

            const blockedRanges = (existingBookings || []).map((b: any) => {
                const bookingDate = new Date(b.scheduled_at || '');
                const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
                const duration = b.services?.duration_minutes || 60;
                return { start: startMins, end: startMins + duration + buffer };
            });

            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const isToday = startOfDay.toDateString() === now.toDateString();

            if (isToday && currentMins >= 20 * 60) {
                setAvailableSlots([]);
                setLoadingSlots(false);
                return;
            }

            const slots: string[] = [];
            for (let t = workStart; t + serviceDuration <= workEnd; t += slotStep) {
                const slotStart = t;
                const slotEnd = t + serviceDuration;
                
                if (isToday && slotStart <= currentMins + 60) {
                    continue;
                }

                const isBlocked = blockedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
                if (!isBlocked) {
                    const h = Math.floor(t / 60);
                    const m = t % 60;
                    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
            }
            setAvailableSlots(slots);
        } catch (err) {
            console.error('Error calculating slots', err);
        } finally {
            setLoadingSlots(false);
        }
    };

    const userCredits = profile?.credits || 0;
    const hasEnoughCredits = userCredits >= PLATFORM_FEE;

    const handleSubmit = async () => {
        if (!user || !selectedGuruba) return;
        
        if (!selectedTime) {
            showMessage({ type: 'error', title: 'Missing Time', content: proposeTime ? 'Please select a custom time' : 'Please select a time slot' });
            return;
        }

        const now = new Date();
        const [y, m, d] = date.split('-').map(Number);
        const selectedDateObj = new Date(y, m - 1, d);
        const isToday = selectedDateObj.toDateString() === now.toDateString();
        
        if (isToday) {
            const currentMins = now.getHours() * 60 + now.getMinutes();
            if (currentMins >= 20 * 60) {
                showMessage({ type: 'error', title: 'Booking Closed', content: 'Bookings for today are closed after 8 PM.' });
                return;
            }
            const [sh, sm] = selectedTime.split(':').map(Number);
            const selMins = sh * 60 + sm;
            if (selMins <= currentMins + 60) {
                showMessage({ type: 'error', title: 'Invalid Time', content: 'Please select a time at least 1 hour from now.' });
                return;
            }
        }
        if (isGotraConflict && !gotraOverride) {
            showMessage({ type: 'error', title: 'Gotra Conflict', content: 'Please confirm gotra override' });
            return;
        }
        if (!hasEnoughCredits) {
            showMessage({ type: 'error', title: 'Insufficient Credits', content: 'You do not have enough credits for this booking.' });
            return;
        }

        const basePayload: any = {
            user_id: user.id,
            platform_fee: PLATFORM_FEE,
            location_lat: bookingOnline ? null : location.lat,
            location_lng: bookingOnline ? null : location.lng,
            location_address: bookingOnline ? 'Online' : location.address,
            booking_note: customMessage || null,
            guruba_id: selectedGuruba.id,
            service_id: service.id,
            is_custom_booking: proposeTime,
            is_online: bookingOnline,
        };

        if (proposeTime) {
            basePayload.status = 'pending';
            basePayload.proposed_time = selectedTime ? new Date(`${date}T${selectedTime}`).toISOString() : null;
            basePayload.scheduled_at = null;
        } else {
            basePayload.status = 'pending';
            basePayload.scheduled_at = new Date(`${date}T${selectedTime}`).toISOString();
            basePayload.proposed_time = null;
        }

        try {
            await bookService.mutateAsync(basePayload);
            showMessage({ type: 'success', title: 'Booking Created', content: 'Your booking has been successfully requested.' });
            router.push('/booking-success');
        } catch (err: any) {
            showMessage({ type: 'error', title: 'Booking Failed', content: err.message || 'Failed to book service' });
        }
    };

    // Derived 
    const isStep2Valid = date && selectedTime && (bookingOnline || location.address);

    // Filter gurubas for this service using offeredGurubaServices mapping
    const serviceGurubas = allGurubas.filter(g => 
        offeredGurubaServices.some(ogs => ogs.guruba_id === g.id)
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* Stepper Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-outfit font-bold text-stone-900 mb-6">Book {service.title}</h1>
                
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 rounded-full z-0"></div>
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-saffron-500 rounded-full z-0 transition-all duration-500`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                    
                    {[
                        { num: 1, title: "Select Guruba" },
                        { num: 2, title: "Schedule & Details" },
                        { num: 3, title: "Confirm Booking" }
                    ].map((s) => (
                        <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors duration-300 ${
                                step > s.num ? 'bg-saffron-500 border-saffron-500 text-white' :
                                step === s.num ? 'bg-white border-saffron-500 text-saffron-500' :
                                'bg-stone-50 border-stone-300 text-stone-400'
                            }`}>
                                {step > s.num ? <CheckCircle className="h-5 w-5" /> : s.num}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${step >= s.num ? 'text-stone-900' : 'text-stone-400'}`}>{s.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Select Guruba */}
            {step === 1 && (
                <div className="animate-slide-up space-y-6">
                    <h2 className="text-xl font-bold text-stone-800 font-outfit">Choose a Guruba for this service</h2>
                    {gurubasLoading ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron-500"></div></div>
                    ) : serviceGurubas.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {serviceGurubas.map(g => {
                                const ogs = offeredGurubaServices.find(item => item.guruba_id === g.id);
                                const price = ogs?.custom_price ? Number(ogs.custom_price) : service.base_price;
                                const supportsOnline = service.is_online_enabled && ogs?.is_online;
                                return (
                                    <div 
                                        key={g.id} 
                                        onClick={() => setSelectedGuruba(g)}
                                        className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all border-2 ${selectedGuruba?.id === g.id ? 'border-saffron-500 bg-saffron-50/50 shadow-md ring-4 ring-saffron-500/10' : 'border-transparent hover:border-saffron-200'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-full bg-saffron-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {g.profiles?.avatar_url ? (
                                                    <img src={g.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xl font-bold text-saffron-600">{g.profiles?.full_name?.[0]}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-stone-900 font-outfit truncate">{g.profiles?.full_name}</h3>
                                                <div className="flex items-center text-xs text-stone-500 gap-1 mt-1 flex-wrap">
                                                    <Star className="h-3 w-3 text-saffron-500 fill-saffron-500 shrink-0" />
                                                    <span className="font-bold">{g.rating?.toFixed(1) || 'New'}</span>
                                                    <span className="mx-0.5 text-stone-300">•</span>
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{g.location}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className="text-xs font-bold text-saffron-600">Rs. {price.toLocaleString()}</span>
                                                    {supportsOnline && (
                                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Online Available</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 text-center">
                            <AlertTriangle className="h-8 w-8 text-stone-400 mx-auto mb-3" />
                            <h3 className="font-bold text-stone-700">No Gurubas Available</h3>
                            <p className="text-stone-500 text-sm mt-1">There are currently no Gurubas offering {service.title}.</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 border-t border-stone-200 mt-8">
                        <Button 
                            onClick={() => setStep(2)} 
                            disabled={!selectedGuruba}
                            className="bg-stone-900 text-white hover:bg-stone-800"
                        >
                            Continue <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Schedule & Details */}
            {step === 2 && (
                <div className="animate-slide-up space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Col: Date & Time */}
                        <div className="space-y-6">
                            {isOnlineAvailable && (
                                <section className="glass-panel p-6 rounded-3xl">
                                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2 font-outfit">
                                        <Info className="h-4 w-4 text-stone-400" /> Booking Type
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setBookingOnline(false)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all ${!bookingOnline ? 'border-saffron-500 bg-saffron-50/30 font-bold text-saffron-900 shadow-sm' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                                        >
                                            <span className="block text-sm">Physical/Offline</span>
                                            <span className="text-[10px] opacity-70 block mt-1">Guruba visits you</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBookingOnline(true)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all ${bookingOnline ? 'border-saffron-500 bg-saffron-50/30 font-bold text-saffron-900 shadow-sm' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                                        >
                                            <span className="block text-sm">Online Video Call</span>
                                            <span className="text-[10px] opacity-70 block mt-1">Zoom / Meet Call</span>
                                        </button>
                                    </div>
                                </section>
                            )}

                            <section className="glass-panel p-6 rounded-3xl">
                                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> Schedule
                                </h3>
                                
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full rounded-xl border border-white/60 py-3 px-4 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none bg-white/40 backdrop-blur-md font-medium shadow-sm"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                                <div className="mt-4 flex items-start gap-3 bg-saffron-50/50 p-4 rounded-xl border border-saffron-100">
                                    <input type="checkbox" id="propose" checked={proposeTime} onChange={(e) => { setProposeTime(e.target.checked); setSelectedTime(''); }} className="mt-0.5 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"/>
                                    <label htmlFor="propose" className="text-sm text-stone-700 cursor-pointer">
                                        <span className="font-bold block text-stone-900">Propose a custom time</span>
                                        <span className="text-xs">If you can't find a suitable slot, propose one and the Guruba will confirm.</span>
                                    </label>
                                </div>

                                <div className="mt-6">
                                    {proposeTime ? (
                                        <div>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 font-outfit">Choose Custom Time</h4>
                                            <input
                                                type="time"
                                                className="w-full rounded-xl border border-white/60 py-3 px-4 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none bg-white/40 backdrop-blur-md font-medium shadow-sm"
                                                value={selectedTime}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Available Slots</h4>
                                            <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 p-4 min-h-[140px] shadow-sm">
                                                {loadingSlots ? (
                                                    <div className="flex h-full items-center justify-center text-sm text-stone-500 animate-pulse">Loading schedule...</div>
                                                ) : !date ? (
                                                    <div className="flex h-full items-center justify-center text-sm text-stone-400 text-center">Select a date</div>
                                                ) : availableSlots.length === 0 ? (
                                                    <div className="flex flex-col h-full items-center justify-center text-sm text-stone-500 text-center gap-2">
                                                        <Info className="h-5 w-5 text-stone-400"/>
                                                        Fully booked on this date.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {availableSlots.map((slot) => (
                                                            <button
                                                                key={slot} type="button" onClick={() => setSelectedTime(slot)}
                                                                className={`py-2 text-sm font-bold rounded-xl border transition-all ${selectedTime === slot ? 'bg-gradient-to-r from-saffron-500 to-orange-500 text-white border-saffron-600 shadow-md shadow-saffron-500/20 scale-105' : 'bg-white/60 text-stone-700 border-white/80 hover:border-saffron-400 hover:bg-white active:scale-95'}`}
                                                            >
                                                                 {slot}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Right Col: Location & Notes */}
                        <div className="space-y-6">
                            <section className="glass-panel p-6 rounded-3xl">
                                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Location & Notes
                                </h3>
                                {bookingOnline ? (
                                    <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 flex items-start gap-3 text-sm text-blue-800">
                                        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block mb-1">Online Booking Selected</span>
                                            <span>No physical location required. A meeting link (e.g. Zoom/Google Meet) will be created and shared in the chat window once your Guruba accepts the request.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="rounded-xl overflow-hidden border border-stone-200">
                                            <LocationPicker initialLocation={location.lat ? location : undefined} onLocationSelect={setLocation} />
                                        </div>
                                        
                                        {/* Distance Display */}
                                        {location.lat !== 0 && selectedGuruba?.profiles?.latitude && (
                                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-stone-700 flex items-center gap-2">
                                                        <Navigation className="h-4 w-4 text-saffron-600" />
                                                        Distance to Guruba
                                                    </span>
                                                    {distanceLoading ? (
                                                        <span className="text-sm text-stone-500 animate-pulse">Calculating...</span>
                                                    ) : roadDistance !== null ? (
                                                        <span className="text-sm font-bold text-stone-900">{roadDistance.toFixed(1)} km</span>
                                                    ) : (
                                                        <span className="text-sm text-stone-500">Unavailable</span>
                                                    )}
                                                </div>
                                                
                                                {roadDistance !== null && roadDistance > MAX_RECOMMENDED_DISTANCE && (
                                                    <div className="mt-2 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                                        <p className="text-xs text-red-800">
                                                            This location is more than {MAX_RECOMMENDED_DISTANCE}km away from the Guruba's base. 
                                                            They may decline the booking or request additional travel compensation.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <textarea
                                    placeholder="Add any special instructions for the Guruba..." 
                                    rows={3} 
                                    value={customMessage} 
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none resize-none"
                                />
                            </section>
                            
                            {isGotraConflict && (
                                <div className="rounded-2xl bg-red-50 p-5 border border-red-200">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-red-900 text-sm">Gotra Conflict</p>
                                            <p className="mt-1 text-xs text-red-800">
                                                You and {selectedGuruba?.profiles?.full_name} both belong to the <strong>{userGotra}</strong> Gotra.
                                            </p>
                                            <div className="mt-3 flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-red-100">
                                                <input type="checkbox" id="gotra" className="h-4 w-4 text-red-600 rounded focus:ring-red-500" checked={gotraOverride} onChange={(e) => setGotraOverride(e.target.checked)}/>
                                                <label htmlFor="gotra" className="text-xs font-bold text-red-900 cursor-pointer">I accept this match</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="fixed md:static bottom-[calc(env(safe-area-inset-bottom)+60px)] md:bottom-auto left-0 w-full md:w-auto bg-white/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-4 md:p-0 border-t md:border-t border-stone-200 mt-8 flex justify-between z-40">
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-stone-500">
                            <ChevronLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button 
                            onClick={() => setStep(3)} 
                            disabled={!isStep2Valid || (isGotraConflict && !gotraOverride)}
                            className="bg-stone-900 text-white hover:bg-stone-800"
                        >
                            Review Booking <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
                <div className="animate-slide-up max-w-xl mx-auto space-y-6">
                    <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron-400 to-orange-500"></div>
                        <h2 className="text-2xl font-bold font-outfit text-stone-900 mb-6">Booking Summary</h2>
                        
                        <div className="space-y-4 text-left">
                            <div className="flex justify-between items-center py-3 border-b border-stone-100">
                                <span className="text-stone-500 font-medium">Service</span>
                                <span className="font-bold text-stone-900">{service.title}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-stone-100">
                                <span className="text-stone-500 font-medium">Guruba</span>
                                <span className="font-bold text-stone-900">{selectedGuruba?.profiles?.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-stone-100">
                                <span className="text-stone-500 font-medium">Booking Type</span>
                                <span className="font-bold text-stone-900">{bookingOnline ? 'Online Video Ritual' : 'Physical/Offline'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-stone-100">
                                <span className="text-stone-500 font-medium">Date & Time</span>
                                <span className="font-bold text-stone-900">{date} at {selectedTime || 'Proposed Time'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-stone-100">
                                <span className="text-stone-500 font-medium">Service Price</span>
                                <span className="font-bold text-stone-900">Rs. {actualPrice}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-saffron-50/50 rounded-xl px-4 mt-4 border border-saffron-100">
                                <span className="text-stone-700 font-bold flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-saffron-600" /> Platform Booking Fee
                                </span>
                                <span className="font-bold text-xl text-saffron-600 font-outfit">{PLATFORM_FEE} CR</span>
                            </div>
                        </div>

                        {!user ? (
                            <div className="mt-6 bg-saffron-50 text-saffron-900 p-5 rounded-2xl border border-saffron-200 text-center shadow-sm">
                                <h3 className="font-bold mb-2">Account Required</h3>
                                <p className="text-sm text-saffron-700 mb-4">Please log in or create an account to complete your booking.</p>
                                <div className="flex justify-center gap-3">
                                    <Button onClick={() => router.push(`/login?redirect=/book/${service.id}`)} variant="outline" className="border-saffron-300 text-saffron-700 hover:bg-saffron-100">Log In</Button>
                                    <Button onClick={() => router.push(`/register?redirect=/book/${service.id}`)} className="bg-saffron-500 text-stone-900 hover:bg-saffron-400">Sign Up</Button>
                                </div>
                            </div>
                        ) : !hasEnoughCredits && (
                            <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-200">
                                You have {userCredits} CR. You need {PLATFORM_FEE} CR for the platform fee to proceed. Please top up your wallet.
                            </div>
                        )}
                    </div>

                    <div className="fixed md:static bottom-[calc(env(safe-area-inset-bottom)+60px)] md:bottom-auto left-0 w-full md:w-auto bg-white/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-4 md:p-0 border-t md:border-t border-stone-200 mt-8 flex justify-between z-40">
                        <Button variant="ghost" onClick={() => setStep(2)} className="text-stone-500">
                            <ChevronLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            isLoading={bookService.isPending}
                            disabled={!user || bookService.isPending || !hasEnoughCredits}
                            className="bg-saffron-500 text-stone-900 hover:bg-saffron-400 px-8 w-full md:w-auto ml-4"
                        >
                            Confirm Booking <CheckCircle className="h-4 w-4 ml-2 hidden md:inline" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
