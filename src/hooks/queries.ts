// src/hooks/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { createNotification } from '@/lib/supabaseRpc';
import { UserProfile, Service, Guruba, Booking } from '@/types';

// Helper to log query errors consistently
const logQueryError = (error: unknown, queryKey: unknown) => {
  console.error(`[React Query] Error in ${JSON.stringify(queryKey)}:`, error);
};

/* ---------- PROFILE ---------- */
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
    onError: (err) => logQueryError(err, ['profile', userId]),
  });
};

/* ---------- SERVICES ---------- */
export const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('title');
      if (error) throw error;
      return data as Service[];
    },
    onError: (err) => logQueryError(err, ['services']),
  });
};

export const useService = (serviceId?: string) => {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      if (error) throw error;
      return data as Service;
    },
    enabled: !!serviceId,
    onError: (err) => logQueryError(err, ['service', serviceId]),
  });
};

/* ---------- GURUBAS ---------- */
export const useGurubas = () => {
  return useQuery({
    queryKey: ['gurubas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gurubas')
        .select(`
          *,
          profiles:user_id (
            full_name,
            gotra_id,
            avatar_url
          )
        `);
      if (error) throw error;
      return data as Guruba[];
    },
    onError: (err) => logQueryError(err, ['gurubas']),
  });
};

/* ---------- BOOKINGS ---------- */
export const useBookings = (userId?: string, role?: 'client' | 'guruba' | 'admin') => {
  return useQuery({
    queryKey: ['bookings', userId, role],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (title, duration_minutes, base_price, image_url),
          gurubas:guruba_id (
            id,
            location,
            profiles:user_id (full_name, avatar_url, phone)
          ),
          profiles:user_id (full_name, avatar_url, phone, email)
        `)
        .order('scheduled_at', { ascending: true });

      if (role === 'guruba') {
        const { data: gurubaData, error: gurubaErr } = await supabase
          .from('gurubas')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (gurubaErr) throw gurubaErr;
        if (gurubaData) {
          query = query.eq('guruba_id', gurubaData.id);
        } else {
          return [];
        }
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!userId,
    onError: (err) => logQueryError(err, ['bookings', userId, role]),
  });
};

/* ---------- MUTATIONS (Actions) ---------- */
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, meeting_link }: { id: string; status: string; meeting_link?: string }) => {
      const updateData: any = { status };
      if (meeting_link) updateData.meeting_link = meeting_link;

      const { error } = await supabase.from('bookings').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => console.error('[Mutation] updateBookingStatus failed:', err),
  });
};

export const useBookService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user_id: string; guruba_id: string; service_id: string; scheduled_at: string; platform_fee: number }) => {
      const { data, error } = await supabase.rpc('book_service', {
        p_user_id: params.user_id,
        p_guruba_id: params.guruba_id,
        p_service_id: params.service_id,
        p_scheduled_at: params.scheduled_at,
        p_platform_fee: params.platform_fee,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // Update credits
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // Create notification for the Guruba about the new booking
      try {
        const booking = data as any;
        await createNotification({
          user_id: variables.guruba_id,
          title: 'New booking scheduled',
          message: `A new booking has been scheduled for ${variables.scheduled_at}.`,
          notification_type: 'booking',
          action_url: `/bookings/${booking.id}`,
        });
      } catch (e) {
        console.error('[Notification] Failed to create booking notification:', e);
      }
    },
    onError: (err) => console.error('[Mutation] bookService failed:', err),
  });
};