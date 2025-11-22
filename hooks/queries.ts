
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
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('title');
      if (error) {
          console.error(error);
          return [];
      }
      return (data || []) as Service[];
    },
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
  });
};

// --- GURUBAS ---
export const useGurubas = () => {
  return useQuery({
    queryKey: ['gurubas'],
    queryFn: async () => {
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
    mutationFn: async (params: { 
        user_id: string, 
        guruba_id: string, 
        service_id: string, 
        scheduled_at: string, 
        platform_fee: number,
        location_lat?: number,
        location_lng?: number,
        location_address?: string
    }) => {
        const { data, error } = await supabase.rpc('book_service', {
            p_user_id: params.user_id,
            p_guruba_id: params.guruba_id,
            p_service_id: params.service_id,
            p_scheduled_at: params.scheduled_at,
            p_platform_fee: params.platform_fee,
            p_location_lat: params.location_lat || null,
            p_location_lng: params.location_lng || null,
            p_location_address: params.location_address || null
        });
        
        if (error) throw error;
        return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); 
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};
