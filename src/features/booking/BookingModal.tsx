"use client";

// features/booking/BookingModal.tsx

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba, SavedLocation } from '../../types';
import { Button } from '../../components/ui/Button';
import { useProfile, useBookService } from '../../hooks/queries';
import {
    Calendar as CalendarIcon,
    Clock,
    AlertTriangle,
    X,
    CreditCard,
    Wallet,
    Navigation,
    Info
} from 'lucide-react';
import { CustomServiceModal } from './CustomServiceModal';
import { LocationPicker } from '../../components/ui/DynamicLocationPicker';
import { useQuery } from '@tanstack/react-query';
import { PLATFORM_FEE } from '../../lib/constants';
import { useMessage } from '../../components/ui/MessageContext';

function getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
) {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }

interface BookingModalProps {
    service: Service;
    guruba: Guruba;
    initialDate?: string;
    onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
    service,
    guruba,
    initialDate,
    onClose,
}) => {
    const { user } = useAuth();
    const router = useRouter();
    const { showMessage } = useMessage();
    const { data: profile } = useProfile(user?.id);
    const bookService = useBookService();

    const { data: allServices = [] } = useQuery({
        queryKey: ['allServices'],
        queryFn: async () => {
            const { data } = await supabase.from('services').select('*');
            return (data || []) as Service[];
        },
    });

    const { data: savedLocations = [] } = useQuery({
        queryKey: ['savedLocations', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase
                .from('saved_locations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at');
            return (data || []) as SavedLocation[];
        },
        enabled: !!user?.id,
    });

    const [date, setDate] = useState(initialDate || '');
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [gotraOverride, setGotraOverride] = useState(false);
    const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
    const [distanceWarning, setDistanceWarning] = useState<string | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [proposeTime, setProposeTime] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([service.id]);
    const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);

    useEffect(() => {
        if (profile?.latitude && profile?.longitude) {
            setLocation({
                lat: profile.latitude,
                lng: profile.longitude,
                address: profile.address || '',
            });
        }
    }, [profile]);

    useEffect(() => {
        if (location.lat && guruba.profiles?.latitude && guruba.profiles?.longitude && !service.is_online_enabled) {
            const dist = getDistanceFromLatLonInKm(location.lat, location.lng, guruba.profiles.latitude, guruba.profiles.longitude);
            if (dist > 10) {
                setDistanceWarning(`Distance Warning: Location is ${dist.toFixed(1)}km away. Exceeds recommended 10km range.`);
            } else {
                setDistanceWarning(null);
            }
        }
    }, [location, guruba, service]);

    const userGotra = profile?.gotra_id;
    const gurubaGotra = guruba.profiles?.gotra_id;
    const isNA = (g?: string) => !g || g.toLowerCase() === 'not applicable' || g.toLowerCase() === 'n/a';
    const isGotraConflict = !isNA(userGotra) && !isNA(gurubaGotra) && userGotra?.toLowerCase() === gurubaGotra?.toLowerCase();

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
            const dayOfWeek = selectedDate.getDay();

            const { data: availData } = await supabase
                .from('guruba_availability')
                .select('*')
                .eq('guruba_id', guruba.id)
                .eq('day_of_week', dayOfWeek)
                .maybeSingle(); 

            if (!availData) {
                setLoadingSlots(false);
                return;
            }

            const startOfDay = new Date(selectedDateStr);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDateStr);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: existingBookings } = await supabase
                .from('bookings')
                .select('scheduled_at, services(duration_minutes)')
                .eq('guruba_id', guruba.id)
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
                const bookingDate = new Date(b.scheduled_at);
                const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
                const duration = b.services?.duration_minutes || 60;
                return { start: startMins, end: startMins + duration + buffer };
            });

            const slots: string[] = [];
            for (let t = workStart; t + serviceDuration <= workEnd; t += slotStep) {
                const slotStart = t;
                const slotEnd = t + serviceDuration;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!proposeTime && !selectedTime) {
            showMessage({ type: 'error', title: 'Missing Time', content: 'Please select a time slot' });
            return;
        }
        if (isGotraConflict && !gotraOverride) {
            showMessage({ type: 'error', title: 'Gotra Conflict', content: 'Please confirm gotra override' });
            return;
        }
        if (!hasEnoughCredits) {
            showMessage({ type: 'error', title: 'Insufficient Credits', content: 'Top up required' });
            return;
        }

        const basePayload: any = {
            user_id: user.id,
            platform_fee: PLATFORM_FEE,
            location_lat: location.lat,
            location_lng: location.lng,
            location_address: location.address,
            booking_note: customMessage || null,
            guruba_id: guruba.id,
            is_custom_booking: false,
        };

        if (proposeTime) {
            basePayload.status = 'awaiting_client_confirmation';
            basePayload.proposed_time = selectedTime ? `${date}T${selectedTime}` : null;
        } else {
            basePayload.status = 'pending';
            basePayload.scheduled_at = new Date(`${date}T${selectedTime}`).toISOString();
        }

        try {
            const servicesToBook = selectedServiceIds.length ? selectedServiceIds : [service.id];
            for (const svcId of servicesToBook) {
                await bookService.mutateAsync({ ...basePayload, service_id: svcId });
            }
            showMessage({ type: 'success', title: 'Booking Created', content: 'Your booking has been successfully requested.' });
            onClose();
            router.push('/booking-success');
        } catch (err: any) {
            showMessage({ type: 'error', title: 'Booking Failed', content: err.message || 'Failed to book service' });
        }
    };

    const userCredits = profile?.credits || 0;
    const hasEnoughCredits = userCredits >= PLATFORM_FEE;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-3xl glass-panel bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-6 py-4">
                    <h2 className="text-xl font-bold font-outfit text-stone-900">Book {guruba.profiles?.full_name}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-200/50 text-stone-400 hover:text-stone-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 space-y-8 scrollbar-thin scrollbar-thumb-stone-200">
                    
                    <section>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">1. Services</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-stone-50/50">
                            {allServices.map((s) => (
                                <label key={s.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-stone-100 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-stone-300 text-saffron-600 focus:ring-saffron-600"
                                        checked={selectedServiceIds.includes(s.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedServiceIds([...selectedServiceIds, s.id]);
                                            else setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                                        }}
                                    />
                                    <span className="text-sm font-medium text-stone-700">{s.title} <span className="text-stone-400 font-normal">({s.duration_minutes}m)</span></span>
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={() => setShowCustomServiceModal(true)} className="mt-3 text-saffron-600 hover:text-saffron-700 font-medium text-sm transition-colors">
                            + Request a new custom service
                        </button>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">2. Schedule</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-xl border border-stone-200 pl-10 py-2.5 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none transition-shadow"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="mt-3 flex items-start gap-2 bg-stone-50 p-3 rounded-lg border border-stone-200">
                                    <input type="checkbox" id="propose" checked={proposeTime} onChange={(e) => setProposeTime(e.target.checked)} className="mt-0.5 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"/>
                                    <label htmlFor="propose" className="text-xs text-stone-600 font-medium cursor-pointer">I want to propose a specific time instead of using available slots</label>
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 rounded-xl border border-stone-200 p-3 min-h-[120px]">
                                {loadingSlots ? (
                                    <div className="flex h-full items-center justify-center text-sm text-stone-500 font-medium animate-pulse">Loading schedule...</div>
                                ) : !date ? (
                                    <div className="flex h-full items-center justify-center text-sm text-stone-400 font-medium text-center">Select a date to view<br/>available slots</div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="flex flex-col h-full items-center justify-center text-sm text-stone-500 text-center gap-2">
                                        <Info className="h-5 w-5 text-stone-400"/>
                                        Guruba is fully booked or unavailable on this date.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                                        {availableSlots.map((slot) => (
                                            <button
                                                key={slot} type="button" onClick={() => setSelectedTime(slot)}
                                                className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all ${selectedTime === slot ? 'bg-saffron-500 text-white border-saffron-600 shadow-md scale-[0.98]' : 'bg-white text-stone-700 border-stone-200 hover:border-saffron-400 hover:text-saffron-600 hover:shadow-sm'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                    
                    {isGotraConflict && (
                        <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-900 text-sm">Gotra Conflict Detected</p>
                                    <p className="mt-1 text-xs text-red-800 leading-relaxed">
                                        You and {guruba.profiles?.full_name} both belong to the <strong>{userGotra}</strong> Gotra.
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-red-100">
                                        <input type="checkbox" id="gotra-override" className="h-4 w-4 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer" checked={gotraOverride} onChange={(e) => setGotraOverride(e.target.checked)}/>
                                        <label htmlFor="gotra-override" className="text-xs font-bold text-red-900 cursor-pointer select-none">I accept this match (e.g. booking for someone else)</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <section>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">3. Location & Notes</h3>
                            {savedLocations.length > 0 && (
                                <select className="text-xs font-bold text-stone-600 border border-stone-200 rounded-lg py-1.5 px-3 bg-stone-50 outline-none" onChange={(e) => {
                                    const loc = savedLocations.find((l) => l.id === e.target.value);
                                    if (loc) setLocation({ lat: loc.latitude, lng: loc.longitude, address: loc.address || '' });
                                }}>
                                    <option value="">Use Saved Location</option>
                                    {savedLocations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                                </select>
                            )}
                        </div>
                        <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                            <LocationPicker initialLocation={location.lat ? location : undefined} onLocationSelect={setLocation} />
                        </div>
                        {distanceWarning && (
                            <div className="mt-3 flex items-start gap-2 text-xs font-bold text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                <Navigation className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                <span>{distanceWarning}</span>
                            </div>
                        )}
                        <textarea
                            placeholder="Add any special instructions or notes for the Guruba..." rows={2} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
                            className="w-full mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 focus:bg-white outline-none transition-all"
                        />
                    </section>
                </div>

                <div className="bg-stone-900 p-5 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-stone-400 bg-stone-800 px-3 py-1.5 rounded-lg">
                            <Wallet className="h-4 w-4" /> <span className="text-sm font-bold">Bal: <span className={hasEnoughCredits ? 'text-green-400' : 'text-red-400'}>{userCredits} CR</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <span className="text-sm text-stone-400">Fee:</span> <span className="text-lg font-outfit font-bold text-saffron-400">{PLATFORM_FEE} CR</span>
                        </div>
                    </div>
                    <Button onClick={handleSubmit} isLoading={bookService.isPending} disabled={!hasEnoughCredits || (!selectedTime && !proposeTime)} className="w-full sm:w-auto bg-saffron-500 hover:bg-saffron-400 text-stone-900 font-bold rounded-xl px-8 shadow-lg shadow-saffron-500/20 active:scale-95 transition-all">
                        <CreditCard className="h-4 w-4 mr-2" /> Confirm Booking
                    </Button>
                </div>
            </div>
            {showCustomServiceModal && <CustomServiceModal isOpen={showCustomServiceModal} onClose={() => setShowCustomServiceModal(false)} onCreated={(id) => setSelectedServiceIds([...selectedServiceIds, id])} />}
        </div>
    );
};