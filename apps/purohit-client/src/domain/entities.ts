export type AppRole = 'client' | 'guruba' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'awaiting_client_confirmation' | string;

export type GurubaSummary = {
  guruba_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  years_experience: number | null;
  rating: number | null;
  location: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  guruba_type: string | null;
  review_count: number | null;
  is_verified: boolean | null;
  gotra_id: string | null;
};

export type ServiceSummary = {
  id: string;
  name: string | null;
  description: string | null;
  credits: number | null;
};

export type BookingSummary = {
  id: string;
  status: BookingStatus;
  scheduled_at: string | null;
  service_name: string | null;
  guruba_name: string | null;
  total_credits: number | null;
};
