
// hooks/queries.ts

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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
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
        const { data, error } = await supabase
          .from('gurubas')
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              gotra_id,
              avatar_url
            )
          `);
        if (error) {
            console.error(error);
            return [];
        }
        return (data || []) as Guruba[];
      } catch (e) {
        console.error("Exception fetching gurubas:", e);
        return [];
      }
    },
  });
};

// --- BOOKINGS ---
export const useBookings = (userId?: string, role?: 'client' | 'guruba' | 'admin') => {
  return useQuery({
    queryKey: ['bookings', userId, role],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        let query = supabase
            .from('bookings')
            .select(`
            *,
            services:service_id (title, duration_minutes, base_price, image_url),
            gurubas:guruba_id (
                id,
                user_id,
                location,
                profiles:user_id (id, full_name, avatar_url, phone)
            ),
            profiles:user_id (id, full_name, avatar_url, phone, email) 
            `)
            .order('scheduled_at', { ascending: true });

        if (role === 'guruba') {
            const { data: gurubaData, error: gError } = await supabase
                .from('gurubas')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (gError || !gurubaData) return [];
            query = query.eq('guruba_id', gurubaData.id);
        } else if (role === 'client') {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as Booking[];
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
    mutationFn: async ({ id, status, meeting_link }: { id: string, status: string, meeting_link?: string }) => {
      const updateData: any = { status };
      if (meeting_link) updateData.meeting_link = meeting_link;
      
      const { error } = await supabase.from('bookings').update(updateData).eq('id', id);
      if (error) throw error;
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
        // Direct insert into bookings table
        const { data, error } = await supabase.from('bookings').insert([{
            user_id: params.user_id,
            guruba_id: params.guruba_id,
            service_id: params.service_id,
            scheduled_at: params.scheduled_at || null,
            proposed_time: params.proposed_time || null,
            status: params.status || 'pending',
            booking_note: params.booking_note || null,
            location_lat: params.location_lat || null,
            location_lng: params.location_lng || null,
            location_address: params.location_address || null
        }]).select();
        
        if (error) {
            console.error("Booking error:", error);
            throw error;
        }

        // Ideally we should also deduct the platform fee and create a transaction,
        // but if RLS blocks it, we might need to rely on the backend.
        // Let's try to deduct credits directly
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', params.user_id).single();
        if (profile && profile.credits >= params.platform_fee) {
             await supabase.from('profiles').update({ credits: profile.credits - params.platform_fee }).eq('id', params.user_id);
             await supabase.from('transactions').insert([{
                 user_id: params.user_id,
                 amount: -params.platform_fee,
                 type: 'booking_fee',
                 description: 'Booking platform fee',
                 status: 'completed'
             }]);
        }

        return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); 
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};
