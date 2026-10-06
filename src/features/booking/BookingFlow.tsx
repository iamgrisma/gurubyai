"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba, SavedLocation } from '../../types';
import { useBookService, useProfile } from '../../hooks/queries';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { LocationPicker } from '../../components/ui/DynamicLocationPicker';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Wallet,
  Navigation,
  Info,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Star,
  MapPin,
  Video,
  Home,
  Bookmark,
  RotateCcw,
} from 'lucide-react';
import { PLATFORM_FEE, MAX_RECOMMENDED_DISTANCE } from '../../lib/constants';
import { useMessage } from '../../components/ui/MessageContext';

interface BookingFlowProps {
  service: Service;
}

type BookingMode = 'offline' | 'online';

interface OfferedGurubaService {
  guruba_id: string;
  service_id: string;
  is_online?: boolean;
  custom_price?: number | string | null;
  gurubas?: Guruba & {
    profiles?: Guruba['profiles'];
  };
}

interface LocationValue {
  lat: number;
  lng: number;
  address: string;
}

const NEPAL_TIMEZONE = 'Asia/Kathmandu';

const getTodayInNepal = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const toNepalDateTime = (date: string, time: string) =>
  new Date(new Date(`${date}T${time}:00`).toLocaleString('en-US', { timeZone: NEPAL_TIMEZONE }));

const toBookingTimestamp = (date: string, time: string) => {
  // The app operates on Nepal local booking times. Convert the selected
  // calendar/time values to an ISO timestamp without relying on the browser TZ.
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - (5 * 60 + 45) * 60 * 1000;
  return new Date(utcMs).toISOString();
};

export const BookingFlow: React.FC<BookingFlowProps> = ({ service }) => {
  const { user } = useAuth();
  const router = useRouter();
  const { showMessage } = useMessage();
  const searchParams = useSearchParams();
  const preselectedGurubaId = searchParams.get('gurubaId');

  const { data: profile } = useProfile(user?.id);
  const bookService = useBookService();

  const [step, setStep] = useState<number>(preselectedGurubaId ? 2 : 1);
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);
  const [date, setDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [proposeTime, setProposeTime] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>('offline');
  const [location, setLocation] = useState<LocationValue>({ lat: 0, lng: 0, address: '' });
  const [customMessage, setCustomMessage] = useState('');
  const [gotraOverride, setGotraOverride] = useState(false);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  const { data: offeredGurubaServices = [], isLoading: offeredLoading, error: offeredError } =
    useQuery<OfferedGurubaService[]>({
      queryKey: ['offeredGurubaServices', service.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('guruba_services')
          .select(`
            guruba_id,
            service_id,
            is_online,
            custom_price,
            gurubas (
              id,
              user_id,
              bio,
              years_experience,
              rating,
              location,
              specialties,
              is_verified,
              verification_requested_at,
              guruba_type,
              languages,
              profiles:user_id (
                id,
                full_name,
                gotra_id,
                avatar_url,
                latitude,
                longitude,
                address
              )
            )
          `)
          .eq('service_id', service.id);

        if (error) throw error;
        return (data || []) as unknown as OfferedGurubaService[];
      },
      staleTime: 60_000,
    });

  const serviceGurubas = useMemo(() => {
    const unique = new Map<string, Guruba>();
    offeredGurubaServices.forEach((item) => {
      if (item.gurubas?.id) unique.set(item.gurubas.id, item.gurubas as Guruba);
    });
    return Array.from(unique.values());
  }, [offeredGurubaServices]);

  const selectedGurubaService = useMemo(
    () => offeredGurubaServices.find((item) => item.guruba_id === selectedGuruba?.id),
    [offeredGurubaServices, selectedGuruba?.id]
  );

  const actualPrice =
    selectedGurubaService?.custom_price !== null &&
    selectedGurubaService?.custom_price !== undefined
      ? Number(selectedGurubaService.custom_price)
      : Number(service.base_price || 0);

  const isOnlineAvailable = Boolean(service.is_online_enabled && selectedGurubaService?.is_online);
  const hasFixedDuration = Number(service.duration_minutes) > 0;
  const todayInNepal = getTodayInNepal();

  const { data: savedLocations = [] } = useQuery<SavedLocation[]>({
    queryKey: ['savedLocations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('saved_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavedLocation[];
    },
    enabled: !!user?.id && bookingMode === 'offline',
    staleTime: 60_000,
  });

  const {
    data: availableSlots = [],
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery<string[]>({
    queryKey: ['bookingSlots', selectedGuruba?.id, service.id, date],
    queryFn: async () => {
      if (!selectedGuruba?.id || !date || !hasFixedDuration) return [];
      const { data, error } = await supabase.rpc('get_available_booking_slots', {
        p_guruba_id: selectedGuruba.id,
        p_service_id: service.id,
        p_date: date,
      });
      if (error) throw error;
      return ((data || []) as { slot_time: string }[]).map((row) => row.slot_time);
    },
    enabled: !!selectedGuruba?.id && !!date && !proposeTime && hasFixedDuration,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (preselectedGurubaId && serviceGurubas.length > 0) {
      const found = serviceGurubas.find((g) => g.id === preselectedGurubaId);
      if (found) setSelectedGuruba(found);
    }
  }, [preselectedGurubaId, serviceGurubas]);

  useEffect(() => {
    if (!hasFixedDuration) {
      setProposeTime(true);
    }
  }, [hasFixedDuration]);

  useEffect(() => {
    if (selectedGuruba && !isOnlineAvailable && bookingMode === 'online') {
      setBookingMode('offline');
    }
  }, [selectedGuruba, isOnlineAvailable, bookingMode]);

  useEffect(() => {
    if (profile?.latitude !== undefined && profile?.longitude !== undefined) {
      setLocation({
        lat: profile.latitude,
        lng: profile.longitude,
        address: profile.address || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    setSelectedTime('');
    setGotraOverride(false);
  }, [date, selectedGuruba?.id, proposeTime]);

  useEffect(() => {
    if (
      bookingMode === 'online' ||
      !location.lat ||
      !selectedGuruba?.profiles?.latitude ||
      !selectedGuruba?.profiles?.longitude
    ) {
      setRoadDistance(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setDistanceLoading(true);
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${location.lng},${location.lat};${selectedGuruba.profiles!.longitude},${selectedGuruba.profiles!.latitude}?overview=false`
        );
        if (!response.ok) throw new Error('Route lookup failed');
        const data = await response.json();
        if (!data.routes?.length) throw new Error('No route');
        setRoadDistance(Number(data.routes[0].distance) / 1000);
      } catch {
        const lat1 = location.lat * Math.PI / 180;
        const lat2 = Number(selectedGuruba.profiles!.latitude) * Math.PI / 180;
        const dLat = lat2 - lat1;
        const dLon = (Number(selectedGuruba.profiles!.longitude) - location.lng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        setRoadDistance(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      } finally {
        setDistanceLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    bookingMode,
    location.lat,
    location.lng,
    selectedGuruba?.profiles?.latitude,
    selectedGuruba?.profiles?.longitude,
  ]);

  const userGotra = profile?.gotra_id;
  const gurubaGotra = selectedGuruba?.profiles?.gotra_id;
  const isNA = (value?: string) =>
    !value || ['not applicable', 'n/a'].includes(value.toLowerCase());
  const isGotraConflict =
    !isNA(userGotra) &&
    !isNA(gurubaGotra) &&
    userGotra?.toLowerCase() === gurubaGotra?.toLowerCase();

  const hasEnoughCredits = Number(profile?.credits || 0) >= PLATFORM_FEE;
  const locationReady =
    bookingMode === 'online' || Boolean(location.address && location.lat && location.lng);
  const timeReady = Boolean(date && selectedTime);
  const canReview =
    Boolean(user && selectedGuruba && timeReady && locationReady) &&
    (!isGotraConflict || gotraOverride);

  const handleSelectGuruba = (guruba: Guruba) => {
    setSelectedGuruba(guruba);
    setSelectedTime('');
    setDate('');
    setGotraOverride(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewBooking = () => {
    if (!selectedGuruba) {
      showMessage({ type: 'error', title: 'Select a Guruba', content: 'Choose a Guruba before continuing.' });
      return;
    }
    if (!date) {
      showMessage({ type: 'error', title: 'Select a Date', content: 'Choose the booking date first.' });
      return;
    }
    if (!selectedTime) {
      showMessage({
        type: 'error',
        title: proposeTime ? 'Choose a Time' : 'Choose a Time Slot',
        content: proposeTime
          ? 'Choose the time you want to propose to the Guruba.'
          : 'Choose one of the available time slots.',
      });
      return;
    }
    if (!locationReady) {
      showMessage({
        type: 'error',
        title: 'Choose Location',
        content: 'Set the physical booking location on the map or choose a saved location.',
      });
      return;
    }
    if (isGotraConflict && !gotraOverride) {
      showMessage({
        type: 'error',
        title: 'Gotra Confirmation Required',
        content: 'Please confirm that you accept this Guruba match.',
      });
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!user || !selectedGuruba || !date || !selectedTime) return;

    if (!hasEnoughCredits) {
      showMessage({
        type: 'error',
        title: 'Insufficient Credits',
        content: `You have ${profile?.credits || 0} CR. You need ${PLATFORM_FEE} CR for the booking fee.`,
      });
      return;
    }

    if (!canReview) {
      showMessage({
        type: 'error',
        title: 'Booking Details Incomplete',
        content: 'Please return to the previous step and complete all required details.',
      });
      return;
    }

    if (!proposeTime && !availableSlots.includes(selectedTime)) {
      showMessage({
        type: 'error',
        title: 'Slot No Longer Available',
        content: 'That slot was just taken. Refresh the available slots and choose another time.',
      });
      await refetchSlots();
      setStep(2);
      return;
    }

    const timestamp = toBookingTimestamp(date, selectedTime);
    const payload = {
      user_id: user.id,
      guruba_id: selectedGuruba.id,
      service_id: service.id,
      platform_fee: PLATFORM_FEE,
      scheduled_at: proposeTime ? null : timestamp,
      proposed_time: proposeTime ? timestamp : null,
      location_lat: bookingMode === 'online' ? null : location.lat,
      location_lng: bookingMode === 'online' ? null : location.lng,
      location_address: bookingMode === 'online' ? 'Online' : location.address,
      booking_note: customMessage.trim() || null,
      is_custom_booking: proposeTime,
      is_online: bookingMode === 'online',
    };

    try {
      await bookService.mutateAsync(payload);
      showMessage({
        type: 'success',
        title: proposeTime ? 'Time Proposal Sent' : 'Booking Requested',
        content: proposeTime
          ? 'Your proposed time has been sent to the Guruba for confirmation.'
          : 'Your booking request has been created successfully.',
      });
      router.push('/booking-success');
    } catch (error: any) {
      showMessage({
        type: 'error',
        title: 'Booking Failed',
        content: error?.message || 'The booking could not be created. Please try again.',
      });
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-NP', {
      timeZone: NEPAL_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00+05:45`));
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8 pb-36 md:pb-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-stone-900">Book {service.title}</h1>
        <p className="text-sm text-stone-500 mt-1">Complete the booking in three simple steps.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { num: 1, title: 'Guruba' },
            { num: 2, title: 'Schedule' },
            { num: 3, title: 'Review' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => item.num < step && setStep(item.num)}
              className={`rounded-xl px-2 py-2 text-xs sm:text-sm font-bold border transition-colors ${
                step === item.num
                  ? 'bg-saffron-50 border-saffron-400 text-saffron-800'
                  : step > item.num
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wider opacity-70">Step {item.num}</span>
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Choose your Guruba</h2>
                <p className="text-sm text-stone-500 mt-1">
                  {serviceGurubas.length
                    ? `${serviceGurubas.length} Guruba${serviceGurubas.length === 1 ? '' : 's'} offer this service.`
                    : 'No Guruba is currently offering this service.'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-saffron-50 text-saffron-700 text-xs font-bold">
                {service.title}
              </span>
            </div>

            {offeredLoading ? (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {[1, 2].map((n) => (
                  <div key={n} className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : offeredError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                Unable to load Gurubas right now. Please refresh and try again.
              </div>
            ) : serviceGurubas.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-stone-400 mb-3" />
                <p className="font-bold text-stone-700">No Guruba available for this service</p>
                <p className="text-sm text-stone-500 mt-1">Try another service or check back later.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {serviceGurubas.map((guruba) => {
                  const offered = offeredGurubaServices.find((item) => item.guruba_id === guruba.id);
                  const price =
                    offered?.custom_price !== null && offered?.custom_price !== undefined
                      ? Number(offered.custom_price)
                      : Number(service.base_price || 0);
                  const online = Boolean(service.is_online_enabled && offered?.is_online);

                  return (
                    <button
                      key={guruba.id}
                      type="button"
                      onClick={() => handleSelectGuruba(guruba)}
                      className={`text-left glass-panel p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                        selectedGuruba?.id === guruba.id
                          ? 'border-saffron-500 bg-saffron-50/60 shadow-md ring-4 ring-saffron-500/10'
                          : 'border-transparent hover:border-saffron-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-saffron-100 flex items-center justify-center overflow-hidden shrink-0">
                          {guruba.profiles?.avatar_url ? (
                            <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-saffron-600">
                              {guruba.profiles?.full_name?.[0] || 'G'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-stone-900 truncate">
                              {guruba.profiles?.full_name || 'Guruba'}
                            </h3>
                            {guruba.is_verified && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                VERIFIED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-stone-500 gap-1 mt-1 flex-wrap">
                            <Star className="h-3 w-3 text-saffron-500 fill-saffron-500" />
                            <span className="font-bold">{guruba.rating ? Number(guruba.rating).toFixed(1) : 'New'}</span>
                            <span className="text-stone-300">•</span>
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{guruba.location || guruba.profiles?.address || 'Location not set'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs font-bold text-saffron-700">
                              Rs. {price.toLocaleString()}
                            </span>
                            {online && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                                <Video className="h-3 w-3" /> Online
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!selectedGuruba) {
                  showMessage({ type: 'error', title: 'Select a Guruba', content: 'Choose a Guruba first.' });
                  return;
                }
                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-stone-900 text-white hover:bg-stone-800 w-full sm:w-auto"
            >
              Continue to Schedule <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedGuruba && (
        <div className="space-y-5">
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-saffron-100 flex items-center justify-center font-bold text-saffron-700 shrink-0">
                {selectedGuruba.profiles?.full_name?.[0] || 'G'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-400 uppercase font-bold">Selected Guruba</p>
                <p className="font-bold text-stone-900 truncate">{selectedGuruba.profiles?.full_name || 'Guruba'}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Change
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <section className="glass-panel p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-stone-900 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-saffron-600" /> Date & Time
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">All booking times are shown in Nepal time.</p>
                  </div>
                  {hasFixedDuration ? (
                    <span className="text-xs font-bold text-stone-500">
                      {service.duration_minutes} min
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                      Flexible duration
                    </span>
                  )}
                </div>

                <input
                  type="date"
                  min={todayInNepal}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 py-3 px-4 text-sm bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none"
                />

                {date && (
                  <div className="mt-3 text-sm font-semibold text-stone-700">
                    {formatDate(date)}
                  </div>
                )}

                {hasFixedDuration && (
                  <div className="mt-4 flex items-start gap-3 bg-saffron-50 p-4 rounded-xl border border-saffron-100">
                    <input
                      type="checkbox"
                      id="propose"
                      checked={proposeTime}
                      onChange={(e) => {
                        setProposeTime(e.target.checked);
                        setSelectedTime('');
                      }}
                      className="mt-0.5 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"
                    />
                    <label htmlFor="propose" className="text-sm text-stone-700 cursor-pointer">
                      <span className="font-bold block text-stone-900">Propose a custom time</span>
                      <span className="text-xs">
                        Use this if none of the available slots work for you. The Guruba must confirm it.
                      </span>
                    </label>
                  </div>
                )}

                {!hasFixedDuration || proposeTime ? (
                  <div className="mt-5">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" /> {hasFixedDuration ? 'Your Proposed Time' : 'Choose Your Preferred Time'}
                    </label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      disabled={!date}
                      className="w-full rounded-xl border border-stone-200 py-3 px-4 text-sm bg-white disabled:bg-stone-100 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none"
                    />
                    {!hasFixedDuration && (
                      <p className="text-xs text-stone-500 mt-2">
                        This service has no fixed duration in the service catalog, so the Guruba will confirm the exact timing.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Available Time Slots
                      </label>
                      {date && (
                        <button
                          type="button"
                          onClick={() => refetchSlots()}
                          className="text-xs font-bold text-saffron-700 hover:text-saffron-900 flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Refresh
                        </button>
                      )}
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 min-h-[150px]">
                      {!date ? (
                        <div className="h-[120px] flex flex-col items-center justify-center text-center text-stone-400">
                          <CalendarIcon className="h-7 w-7 mb-2" />
                          <span className="text-sm font-semibold">Choose a date to see available times.</span>
                        </div>
                      ) : slotsLoading ? (
                        <div className="h-[120px] flex items-center justify-center text-sm text-stone-500">
                          Checking real-time availability...
                        </div>
                      ) : slotsError ? (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                          <p className="font-bold">Could not load availability.</p>
                          <button
                            type="button"
                            onClick={() => refetchSlots()}
                            className="mt-2 underline font-semibold"
                          >
                            Try again
                          </button>
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTime(slot)}
                              className={`py-2.5 text-sm font-bold rounded-xl border transition-all ${
                                selectedTime === slot
                                  ? 'bg-saffron-500 text-stone-900 border-saffron-600 shadow-md scale-[1.02]'
                                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-saffron-400 hover:bg-saffron-50'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-3">
                          <Info className="h-7 w-7 mx-auto text-stone-400 mb-2" />
                          <p className="text-sm font-bold text-stone-700">No fixed slots available for this date.</p>
                          <p className="text-xs text-stone-500 mt-1">You can still propose your preferred time.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => {
                              setProposeTime(true);
                              setSelectedTime('');
                            }}
                          >
                            Propose a Time
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="glass-panel p-5 rounded-3xl">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4">
                  <Home className="h-4 w-4 text-saffron-600" /> Booking Type
                </h3>
                <div className={`grid ${isOnlineAvailable ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  <button
                    type="button"
                    onClick={() => setBookingMode('offline')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      bookingMode === 'offline'
                        ? 'border-saffron-500 bg-saffron-50 text-saffron-900'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <Home className="h-5 w-5 mb-2" />
                    <span className="font-bold block">Physical / Offline</span>
                    <span className="text-xs opacity-70">Guruba visits your selected location.</span>
                  </button>

                  {isOnlineAvailable && (
                    <button
                      type="button"
                      onClick={() => setBookingMode('online')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        bookingMode === 'online'
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Video className="h-5 w-5 mb-2" />
                      <span className="font-bold block">Online Video</span>
                      <span className="text-xs opacity-70">Meet/Zoom details are shared after acceptance.</span>
                    </button>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="glass-panel p-5 rounded-3xl">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4">
                  <MapPin className="h-4 w-4 text-saffron-600" /> Location
                </h3>

                {bookingMode === 'online' ? (
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 text-sm text-blue-900">
                    <Video className="h-6 w-6 mb-2 text-blue-600" />
                    <p className="font-bold">Online booking selected</p>
                    <p className="mt-1 text-xs">
                      No physical address is required. The Guruba will provide the meeting details after accepting the booking.
                    </p>
                  </div>
                ) : (
                  <>
                    {savedLocations.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bookmark className="h-4 w-4 text-stone-500" />
                          <span className="text-xs font-bold text-stone-500 uppercase">Saved Locations</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {savedLocations.map((saved) => (
                            <button
                              key={saved.id}
                              type="button"
                              onClick={() =>
                                setLocation({
                                  lat: saved.latitude,
                                  lng: saved.longitude,
                                  address: saved.address || saved.name,
                                })
                              }
                              className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-saffron-400 hover:bg-saffron-50"
                            >
                              {saved.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl overflow-hidden border border-stone-200">
                      <LocationPicker
                        initialLocation={location.lat && location.lng ? location : undefined}
                        onLocationSelect={setLocation}
                      />
                    </div>

                    {location.address && (
                      <div className="mt-3 rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
                        <span className="font-bold text-stone-800 block mb-1">Selected location</span>
                        {location.address}
                      </div>
                    )}

                    {location.lat !== 0 && selectedGuruba.profiles?.latitude && (
                      <div className="mt-3 rounded-xl bg-stone-50 border border-stone-200 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-stone-700 flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-saffron-600" /> Distance
                          </span>
                          <span className="font-bold text-stone-900">
                            {distanceLoading ? 'Calculating...' : roadDistance !== null ? `${roadDistance.toFixed(1)} km` : 'Unavailable'}
                          </span>
                        </div>
                        {roadDistance !== null && roadDistance > MAX_RECOMMENDED_DISTANCE && (
                          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
                            This is more than {MAX_RECOMMENDED_DISTANCE} km from the Guruba's base. The Guruba may decline or request travel compensation.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="glass-panel p-5 rounded-3xl">
                <h3 className="font-bold text-stone-900 mb-3">Special instructions</h3>
                <textarea
                  placeholder="Add any special instructions for the Guruba..."
                  rows={4}
                  maxLength={1000}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500 outline-none resize-none"
                />
                <div className="text-right text-[11px] text-stone-400 mt-1">{customMessage.length}/1000</div>
              </section>

              {isGotraConflict && (
                <div className="rounded-2xl bg-red-50 p-5 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-900 text-sm">Gotra Conflict</p>
                      <p className="mt-1 text-xs text-red-800">
                        You and {selectedGuruba.profiles?.full_name || 'this Guruba'} share the <strong>{userGotra}</strong> Gotra.
                      </p>
                      <label className="mt-3 flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-red-100 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-red-600 rounded"
                          checked={gotraOverride}
                          onChange={(e) => setGotraOverride(e.target.checked)}
                        />
                        <span className="text-xs font-bold text-red-900">I accept this match</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 md:static bg-white/95 backdrop-blur-xl md:bg-transparent border-t border-stone-200 md:border-0 p-3 md:p-0 -mx-3 sm:-mx-6 md:mx-0 flex items-center justify-between gap-3 z-40">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-stone-600">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex flex-col items-end">
              {!canReview && (
                <span className="text-[10px] sm:text-xs text-stone-500 mb-1">
                  {!date ? 'Select a date' : !selectedTime ? 'Select a time' : !locationReady ? 'Select a location' : 'Confirm required details'}
                </span>
              )}
              <Button onClick={handleReviewBooking} className="bg-stone-900 text-white hover:bg-stone-800">
                Review Booking <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && selectedGuruba && (
        <div className="max-w-2xl mx-auto space-y-5">
          <section className="glass-panel p-5 sm:p-7 rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-saffron-700">Final review</p>
                <h2 className="text-2xl font-bold text-stone-900 mt-1">Review your booking</h2>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div className="mt-6 divide-y divide-stone-100">
              <div className="py-3 flex justify-between gap-4">
                <span className="text-stone-500">Service</span>
                <span className="font-bold text-right">{service.title}</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-stone-500">Guruba</span>
                <span className="font-bold text-right">{selectedGuruba.profiles?.full_name || 'Guruba'}</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-stone-500">Booking type</span>
                <span className="font-bold text-right">{bookingMode === 'online' ? 'Online Video' : 'Physical / Offline'}</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-stone-500">{proposeTime ? 'Proposed time' : 'Scheduled time'}</span>
                <span className="font-bold text-right">{formatDate(date)} at {selectedTime}</span>
              </div>
              {bookingMode === 'offline' && (
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-stone-500">Location</span>
                  <span className="font-bold text-right max-w-[65%]">{location.address}</span>
                </div>
              )}
              <div className="py-3 flex justify-between gap-4">
                <span className="text-stone-500">Service price</span>
                <span className="font-bold text-right">Rs. {actualPrice.toLocaleString()}</span>
              </div>
              <div className="py-3 px-4 mt-3 rounded-2xl bg-saffron-50 border border-saffron-100 flex justify-between gap-4">
                <span className="font-bold text-stone-700 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-saffron-600" /> Booking fee
                </span>
                <span className="font-bold text-xl text-saffron-700">{PLATFORM_FEE} CR</span>
              </div>
              {customMessage.trim() && (
                <div className="py-3">
                  <span className="text-stone-500 block text-sm">Instructions</span>
                  <p className="mt-1 text-sm text-stone-800 whitespace-pre-wrap">{customMessage.trim()}</p>
                </div>
              )}
            </div>

            {!user ? (
              <div className="mt-5 bg-saffron-50 text-saffron-900 p-5 rounded-2xl border border-saffron-200 text-center">
                <h3 className="font-bold mb-2">Account required</h3>
                <p className="text-sm text-saffron-700 mb-4">Log in or create an account to complete this booking.</p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => router.push(`/login?redirect=/book/${service.id}`)} variant="outline">Log In</Button>
                  <Button onClick={() => router.push(`/register?redirect=/book/${service.id}`)}>Sign Up</Button>
                </div>
              </div>
            ) : !hasEnoughCredits ? (
              <div className="mt-5 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-200">
                You have {profile?.credits || 0} CR. You need {PLATFORM_FEE} CR. Please top up your wallet before confirming.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-green-50 border border-green-100 p-4 text-sm text-green-800">
                <p className="font-bold">Ready to submit</p>
                <p className="mt-1">
                  {proposeTime
                    ? 'Your time will be sent as a proposal and the booking will wait for the Guruba to confirm it.'
                    : 'The selected slot is checked again when the booking is submitted.'}
                </p>
              </div>
            )}
          </section>

          <div className="sticky bottom-0 md:static bg-white/95 backdrop-blur-xl md:bg-transparent border-t border-stone-200 md:border-0 p-3 md:p-0 -mx-3 sm:-mx-6 md:mx-0 flex items-center justify-between gap-3 z-40">
            <Button variant="ghost" onClick={() => setStep(2)} className="text-stone-600">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={bookService.isPending}
              disabled={!user || bookService.isPending || !hasEnoughCredits}
              className="bg-saffron-500 text-stone-900 hover:bg-saffron-400 px-6"
            >
              {proposeTime ? 'Send Time Proposal' : 'Confirm Booking'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
