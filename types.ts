
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'client' | 'guruba' | 'admin';
  phone?: string;
  gotra_id?: string;
  avatar_url?: string;
  created_at?: string;
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
  is_verified?: boolean;
  // Joined data from profiles table
  profiles?: {
    full_name: string;
    gotra_id: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
}

export interface Availability {
  id?: string;
  guruba_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
}

export interface Booking {
  id: string;
  user_id: string;
  guruba_id: string;
  service_id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  is_reviewed?: boolean;
  services?: Service;
  gurubas?: Guruba;
  profiles?: UserProfile; // The client profile
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
