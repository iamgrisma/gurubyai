
// hooks/queries.ts

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Booking, Guruba, Service, UserProfile } from '../types';

// --- PROFILES ---
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const { data, error } = await supabase.rpc('get_my_profile').maybeSingle();
        
        if (error) {
            console.warn("Profile fetch error:", error);
            return null;
        }
        return data as UserProfile;
      } catch (e) {
        console.error("Exception fetching profile:", e);
        return null;
      }
    },
    enabled: !!userId,
    retry: 1, // Fail fast to prevent infinite loading
  });
};

// --- SERVICES ---
export const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('title');
        if (error) {
            console.error(error);
            return [];
        }
        return (data || []) as Service[];
      } catch (e) {
        console.error("Exception fetching services:", e);
        return [];
      }
    },
  });
};

export const useService = (serviceId?: string) => {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();
        if (error) throw error;
        return data as Service;
      } catch (e) {
        console.error("Exception fetching service:", e);
        return null;
      }
    },
    enabled: !!serviceId,
  });
};

// --- GURUBAS ---
export const useGurubas = () => {
  return useQuery({
    queryKey: ['gurubas'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_gurubas');
        if (error) {
            console.error(error);
            return [];
        }
        const rows = (data || []).map((row: any) => ({
          id: row.guruba_id,
          user_id: row.user_id,
          bio: row.bio,
          years_experience: row.years_experience,
          rating: row.rating,
          location: row.location,
          specialties: row.specialties,
          languages: row.languages,
          guruba_type: row.guruba_type,
          review_count: row.review_count,
          is_verified: row.is_verified,
          profiles: { id: row.user_id, full_name: row.full_name, avatar_url: row.avatar_url },
        }));
        return rows as Guruba[];
      } catch (e) {
        console.error("Exception fetching gurubas:", e);
        return [];
      }
    },
  });
};

// --- BOOKINGS ---
export const useBookings = (userId?: string, role: 'client' | 'guruba' = 'client') => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`bookings:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
           queryClient.invalidateQueries({ queryKey: ['bookings'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['bookings', userId, role],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const { data, error } = await supabase.rpc('get_my_bookings', { p_role: role });
        if (error) throw error;
        return (data || []).map((row: any) => ({ ...row, services: row.services || undefined, gurubas: row.gurubas || undefined, profiles: row.profiles || undefined })) as Booking[];
      } catch (e) {
          console.error("Error fetching bookings:", e);
          return [];
      }
    },
    enabled: !!userId,
    retry: 1,
  });
};

// --- MUTATIONS (Actions) ---

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      if (status === 'confirmed') {
        const { error } = await supabase.rpc('confirm_booking', { p_booking_id: id });
        if (error) throw error;
      } else if (status === 'cancelled') {
        const { error } = await supabase.rpc('cancel_booking', { p_booking_id: id });
        if (error) throw error;
      } else if (status === 'completed') {
        const { error } = await supabase.rpc('complete_booking', { p_booking_id: id });
        if (error) throw error;
      } else {
        throw new Error('Unsupported booking status transition');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useSetBookingMeetingLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, meeting_link }: { id: string; meeting_link: string }) => {
      const { error } = await supabase.rpc('set_booking_meeting_link', {
        p_booking_id: id,
        p_meeting_link: meeting_link,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useBookService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: any) => {
      const requestKey =
        typeof params.request_key === 'string' && params.request_key.length >= 8
          ? params.request_key
          : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      const { data: bookingId, error } = await supabase.rpc('book_service_idempotent', {
        p_user_id: params.user_id,
        p_guruba_id: params.guruba_id,
        p_service_id: params.service_id,
        p_scheduled_at: params.scheduled_at || null,
        p_platform_fee: Math.max(0, Number(params.platform_fee || 0)),
        p_location_lat: params.location_lat ?? null,
        p_location_lng: params.location_lng ?? null,
        p_location_address: params.location_address ?? null,
        p_proposed_time: params.proposed_time || null,
        p_booking_note: params.booking_note || null,
        p_is_custom_booking: Boolean(params.is_custom_booking),
        p_is_online: Boolean(params.is_online),
        p_request_key: requestKey,
      });

      if (error) {
        console.error('Booking error:', error);
        throw error;
      }

      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useRescheduleBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scheduled_at }: { id: string; scheduled_at: string }) => {
      const { error } = await supabase.rpc('reschedule_booking', {
        p_booking_id: id,
        p_new_scheduled_at: scheduled_at,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};
