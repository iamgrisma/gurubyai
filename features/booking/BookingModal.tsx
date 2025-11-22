// features/booking/BookingModal.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba, SavedLocation, CustomService } from '../../types';
import { Button } from '../../components/ui/Button';
import { useProfile, useBookService } from '../../hooks/queries';
import {
    Calendar,
    Clock,
    AlertTriangle,
    X,
    MapPin,
    CreditCard,
    Wallet,
    Navigation,
    Info,
    CheckCircle,
} from 'lucide-react';
import { CustomServiceModal } from './CustomServiceModal';
import { LocationPicker } from '../../components/ui/LocationPicker';
import { useQuery } from '@tanstack/react-query';
import { PLATFORM_FEE } from '../../lib/constants';

// Haversine formula – used for distance warnings
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
function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

interface BookingModalProps {
    service: Service; // primary service (kept for backward compatibility)
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
    const navigate = useNavigate();

    // ---------------------------------------------------------------------------
    // Hooks & data fetching
    // ---------------------------------------------------------------------------
    const { data: profile } = useProfile(user?.id);
    const bookService = useBookService();

    // All services for multi‑service selection
    const { data: allServices = [] } = useQuery({
        queryKey: ['allServices'],
        queryFn: async () => {
            const { data } = await supabase.from('services').select('*');
            return (data || []) as Service[];
        },
    });

    // Saved locations for the user
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

    // ---------------------------------------------------------------------------
    // Component state
    // ---------------------------------------------------------------------------
    const [date, setDate] = useState(initialDate || '');
    const [selectedTime, setSelectedTime] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [bookingStep, setBookingStep] = useState(1); // 1 = details, 2 = location/confirm

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [gotraOverride, setGotraOverride] = useState(false);

    const [location, setLocation] = useState({ lat: 0, lng: 0, address: '' });
    const [distanceWarning, setDistanceWarning] = useState<string | null>(null);

    // New state for enhanced flow
    const [customGurubaName, setCustomGurubaName] = useState(''); // optional custom Guruba name
    const [customMessage, setCustomMessage] = useState(''); // optional note for Guruba
    const [proposeTime, setProposeTime] = useState(false); // flag to propose a different time
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([service.id]); // multi‑service selection
    const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);

    // ---------------------------------------------------------------------------
    // Load user's saved location as default
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (profile?.latitude && profile?.longitude) {
            setLocation({
                lat: profile.latitude,
                lng: profile.longitude,
                address: profile.address || '',
            });
        }
    }, [profile]);

    // ---------------------------------------------------------------------------
    // Distance warning (only for offline services)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (
            location.lat &&
            guruba.profiles?.latitude &&
            guruba.profiles?.longitude &&
            !service.is_online_enabled
        ) {
            const dist = getDistanceFromLatLonInKm(
                location.lat,
                location.lng,
                guruba.profiles.latitude,
                guruba.profiles.longitude,
            );
            if (dist > 10) {
                setDistanceWarning(
                    `Distance Warning: The selected location is ${dist.toFixed(
                        1,
                    )}km away from the Guruba. This exceeds the recommended 10km range.`,
                );
            } else {
                setDistanceWarning(null);
            }
        }
    }, [location, guruba, service]);

    // ---------------------------------------------------------------------------
    // Gotra conflict detection
    // ---------------------------------------------------------------------------
    const userGotra = profile?.gotra_id;
    const gurubaGotra = guruba.profiles?.gotra_id;
    const isNA = (g?: string) =>
        !g || g.toLowerCase() === 'not applicable' || g.toLowerCase() === 'n/a';
    const isGotraConflict =
        !isNA(userGotra) &&
        !isNA(gurubaGotra) &&
        userGotra?.toLowerCase() === gurubaGotra?.toLowerCase();

    // ---------------------------------------------------------------------------
    // Availability fetching (slot calculation)
    // ---------------------------------------------------------------------------
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
            const buffer = 30; // 30‑minute buffer between bookings
            const slotStep = serviceDuration + buffer;

            const blockedRanges = (existingBookings || []).map((b: any) => {
                const bookingDate = new Date(b.scheduled_at);
                const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
                const duration = b.services?.duration_minutes || 60;
                // include buffer after each existing booking
                return { start: startMins, end: startMins + duration + buffer };
            });

            const slots: string[] = [];
            for (let t = workStart; t + serviceDuration <= workEnd; t += slotStep) {
                const slotStart = t;
                const slotEnd = t + serviceDuration;
                const isBlocked = blockedRanges.some(
                    (r) => slotStart < r.end && slotEnd > r.start,
                );
                if (!isBlocked) {
                    const h = Math.floor(t / 60);
                    const m = t % 60;
                    slots.push(`${h.toString().padStart(2, '0')}:${m
                        .toString()
                        .padStart(2, '0')}`);
                }
            }

            setAvailableSlots(slots);
        } catch (err) {
            console.error('Error calculating slots', err);
        } finally {
            setLoadingSlots(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Submit handler – supports multi‑service, custom Guruba, propose time, notes
    // ---------------------------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!proposeTime && !selectedTime) {
            setError('Please select a time slot');
            return;
        }
        if (isGotraConflict && !gotraOverride) {
            setError('Gotra conflict – please confirm override');
            return;
        }
        if (!hasEnoughCredits) {
            setError('Insufficient credits');
            return;
        }

        setError(null);

        // Build base payload shared by all services
        const basePayload: any = {
            user_id: user.id,
            platform_fee: PLATFORM_FEE,
            location_lat: location.lat,
            location_lng: location.lng,
            location_address: location.address,
            booking_note: customMessage || null,
            guruba_name: customGurubaName || null,
            is_custom_booking: !!customGurubaName,
        };

        if (proposeTime) {
            basePayload.status = 'awaiting_client_confirmation';
            basePayload.proposed_time = selectedTime
                ? `${date}T${selectedTime}`
                : null;
        } else {
            basePayload.status = 'pending';
            basePayload.scheduled_at = new Date(`${date}T${selectedTime}`).toISOString();
        }

        // If a custom Guruba name is supplied, we omit guruba_id
        if (customGurubaName) {
            basePayload.guruba_id = null;
        } else {
            basePayload.guruba_id = guruba.id;
        }

        try {
            // Loop over each selected service (or the default one)
            const servicesToBook = selectedServiceIds.length
                ? selectedServiceIds
                : [service.id];

            for (const svcId of servicesToBook) {
                await bookService.mutateAsync({
                    ...basePayload,
                    service_id: svcId,
                });
            }

            onClose();
            navigate('/booking-success');
        } catch (err: any) {
            setError(err.message || 'Failed to book service');
        }
    };

    // ---------------------------------------------------------------------------
    // UI helpers
    // ---------------------------------------------------------------------------
    const userCredits = profile?.credits || 0;
    const hasEnoughCredits = userCredits >= PLATFORM_FEE;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
                    <h2 className="text-xl font-bold text-stone-900">
                        {bookingStep === 1 ? 'Select Time & Details' : 'Confirm & Location'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    {bookingStep === 1 ? (
                        // ------------------- STEP 1 -------------------
                        <div className="flex flex-col gap-6">
                            {/* Service preview */}
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

                            {/* Custom Guruba name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">
                                    Guruba Name (optional – for custom Guruba)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter Guruba name"
                                    value={customGurubaName}
                                    onChange={(e) => setCustomGurubaName(e.target.value)}
                                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                                />
                            </div>

                            {/* Multi‑service selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Select Services (you can pick multiple)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-stone-200 rounded p-2">
                                    {allServices.map((s) => (
                                        <label key={s.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedServiceIds.includes(s.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedServiceIds([...selectedServiceIds, s.id]);
                                                    } else {
                                                        setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                                                    }
                                                }}
                                            />
                                            <span className="text-sm">{s.title} ({s.duration_minutes} min)</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomServiceModal(true)}
                                    className="mt-2 text-saffron-600 hover:underline text-sm"
                                >
                                    + Request a new custom service
                                </button>
                            </div>

                            {/* Custom message / note */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">
                                    Message / Instructions for Guruba (optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                                />
                            </div>

                            {/* Propose time checkbox */}
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={proposeTime}
                                    onChange={(e) => setProposeTime(e.target.checked)}
                                />
                                <label className="text-sm text-stone-700">Propose a different time (instead of confirming now)</label>
                            </div>

                            {/* Date picker */}
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

                            {/* Time slots */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Available Time Slots</label>
                                {loadingSlots ? (
                                    <div className="text-sm text-stone-500 animate-pulse">Loading slots…</div>
                                ) : !date ? (
                                    <div className="text-sm text-stone-400">Please select a date first.</div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                        No slots available on this date.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {availableSlots.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setSelectedTime(slot)}
                                                className={`px-2 py-2 text-xs font-medium rounded-md border transition-all ${selectedTime === slot
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

                            {/* Gotra conflict warning */}
                            {isGotraConflict && (
                                <div className="rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 shrink-0" />
                                        <div className="text-sm">
                                            <p className="font-bold">Gotra Conflict Detected</p>
                                            <p className="mt-1 text-xs leading-relaxed">
                                                You and Guruba {guruba.profiles?.full_name} both belong to the{' '}
                                                <strong>{userGotra}</strong> Gotra.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            id="gotra-override"
                                            className="mt-0.5 h-4 w-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                                            checked={gotraOverride}
                                            onChange={(e) => setGotraOverride(e.target.checked)}
                                        />
                                        <label htmlFor="gotra-override" className="text-xs font-medium cursor-pointer select-none">
                                            I accept this match (e.g., booking for someone else).
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // ------------------- STEP 2 -------------------
                        <div className="flex flex-col gap-6">
                            {/* Summary */}
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm">
                                <div className="flex justify-between mb-1">
                                    <span className="text-stone-500">Service(s):</span>
                                    <span className="font-bold">
                                        {selectedServiceIds
                                            .map((id) => allServices.find((s) => s.id === id)?.title || '')
                                            .join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-stone-500">Date & Time:</span>
                                    <span className="font-bold">
                                        {date} {proposeTime ? '(proposed)' : selectedTime}
                                    </span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-stone-500">Guruba:</span>
                                    <span className="font-bold">
                                        {customGurubaName || guruba.profiles?.full_name || 'Custom Guruba'}
                                    </span>
                                </div>
                                {customMessage && (
                                    <div className="flex justify-between mt-2">
                                        <span className="text-stone-500">Note:</span>
                                        <span className="font-medium">{customMessage}</span>
                                    </div>
                                )}
                            </div>

                            {/* Location picker */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-stone-900">Ritual Location</label>
                                    {savedLocations.length > 0 && (
                                        <select
                                            className="text-xs border border-stone-300 rounded p-1 bg-white"
                                            onChange={(e) => {
                                                const loc = savedLocations.find((l) => l.id === e.target.value);
                                                if (loc) setLocation({ lat: loc.latitude, lng: loc.longitude, address: loc.address || '' });
                                            }}
                                        >
                                            <option value="">Load Saved Location…</option>
                                            {savedLocations.map((l) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <LocationPicker initialLocation={location.lat ? location : undefined} onLocationSelect={setLocation} />
                                {distanceWarning && (
                                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                        <Navigation className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{distanceWarning}</span>
                                    </div>
                                )}
                            </div>

                            {/* Credits & fee */}
                            <div className="border-t border-stone-100 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-stone-500 flex items-center gap-2">
                                        <Wallet className="h-4 w-4" /> Balance
                                    </span>
                                    <span className={`font-bold ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}> {userCredits} CR</span>
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

                {/* Footer actions */}
                <div className="bg-stone-50 p-6 border-t border-stone-200 flex justify-end gap-3 shrink-0">
                    {bookingStep === 1 ? (
                        <>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                disabled={!selectedTime && !proposeTime}
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
                                disabled={!hasEnoughCredits || (!selectedTime && !proposeTime)}
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Confirm Booking
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Custom Service Request Modal */}
            {showCustomServiceModal && (
                <CustomServiceModal
                    isOpen={showCustomServiceModal}
                    onClose={() => setShowCustomServiceModal(false)}
                    onCreated={(id) => {
                        setSelectedServiceIds([...selectedServiceIds, id]);
                    }}
                />
            )}
        </div>
    );
};