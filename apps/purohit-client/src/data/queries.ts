import { supabase } from './supabase';
import type { BookingSummary, GurubaSummary, ServiceSummary } from '../domain/entities';

export async function getPublicGurubas(): Promise<GurubaSummary[]> {
  const { data, error } = await supabase.rpc('get_public_gurubas');
  if (error) throw error;
  return (data ?? []) as GurubaSummary[];
}

export async function getPublicBookingOptions(serviceId: string): Promise<ServiceSummary | null> {
  const { data, error } = await supabase.rpc('get_public_booking_options', { p_service_id: serviceId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as ServiceSummary | null;
}
