
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'client' | 'guruba' | 'admin';
  phone?: string;
  gotra_id?: string;
  avatar_url?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  base_price: number;
  image_url: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  guruba_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export interface Guruba {
  id: string;
  user_id: string; // links to UserProfile
  bio: string;
  years_experience: number;
  rating: number; // Average rating
  review_count?: number;
  location: string;
  specialties: string[];
  // Joined data from profiles table
  profiles?: {
    full_name: string;
    gotra_id: string;
    avatar_url?: string;
  };
}

export interface Booking {
  id: string;
  user_id: string;
  guruba_id: string;
  service_id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  is_reviewed?: boolean; // Helper to check if review exists
}
