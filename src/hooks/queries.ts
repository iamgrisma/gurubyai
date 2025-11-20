// src/hooks/queries.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Booking, Guruba, Service, UserProfile } from '../types';

// --- PROFILES ---
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
      if (error) throw error;
      return data as Service[];
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
            full_name,
            gotra_id,
            avatar_url
          )
        `);
      if (error) throw error;
      return data as Guruba[];
    },
  });
};

// --- BOOKINGS ---
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
        // For Gurubas, we need to find the guruba record first or join differently.
        // Assuming the userId passed here is the Auth ID. 
        // We need to match the auth ID to the guruba record.
        const { data: gurubaData } = await supabase.from('gurubas').select('id').eq('user_id', userId).single();
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
    mutationFn: async (params: { user_id: string, guruba_id: string, service_id: string, scheduled_at: string, platform_fee: number }) => {
        // Call the RPC function we created in SQL
        const { data, error } = await supabase.rpc('book_service', {
            p_user_id: params.user_id,
            p_guruba_id: params.guruba_id,
            p_service_id: params.service_id,
            p_scheduled_at: params.scheduled_at,
            p_platform_fee: params.platform_fee
        });
        
        if (error) throw error;
        return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // Update credits
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};