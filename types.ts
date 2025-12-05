
// types.ts

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'client' | 'guruba' | 'admin';
  phone?: string;
  gotra_id?: string;
  avatar_url?: string;
  city?: string;
  languages?: string[];
  credits: number;
  // Location
  latitude?: number;
  longitude?: number;
  address?: string;

  created_at?: string;
}

export interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  created_at: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  base_price: number;
  image_url: string;
  category?: string;
  is_featured?: boolean;
  is_online_enabled?: boolean;
}

export interface GurubaService {
  guruba_id: string;
  service_id: string;
  is_online: boolean;
  custom_price?: number;
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
  user_id: string;
  bio: string;
  years_experience: number;
  rating: number;
  review_count?: number;
  location: string;
  specialties: string[];
  is_verified?: boolean;
  verification_requested_at?: string;
  guruba_type?: 'brahmin' | 'non_brahmin' | 'astrologer';
  languages?: string[];
  email?: string;
  profiles?: {
    id: string;
    full_name: string;
    gotra_id: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface Availability {
  id?: string;
  guruba_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Booking {
  id: string;
  user_id: string;
  guruba_id?: string; // Now optional for custom bookings
  service_id?: string; // Now optional for multi-service bookings
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'awaiting_client_confirmation';
  is_reviewed?: boolean;
  services?: Service;
  gurubas?: Guruba;
  profiles?: UserProfile;

  proposed_time?: string;
  confirmation_deadline?: string;
  platform_fee?: number;
  meeting_link?: string;

  // Booking specific location
  location_lat?: number;
  location_lng?: number;
  location_address?: string;

  // Enhanced booking fields
  guruba_name?: string; // For custom bookings without guruba_id
  is_custom_booking?: boolean;
  booking_note?: string; // Custom message/instructions

  created_at: string;
}

export interface CustomService {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  estimated_duration_minutes: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  expires_at: string;
  approved_by?: string;
  approved_at?: string;
  profiles?: UserProfile; // User who requested
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id?: string;
  custom_service_id?: string;
  created_at: string;
  services?: Service; // Joined service data
  custom_services?: CustomService; // Joined custom service data
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
  notification_type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment' | 'credit' | 'system';
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  booking_id?: string;
  content: string;
  message_type: 'text' | 'booking_created' | 'booking_confirmed' | 'booking_cancelled' |
  'booking_completed' | 'time_proposed' | 'time_accepted' | 'time_rejected' |
  'custom_service_requested' | 'payment_received' | 'credit_approved' | 'credit_rejected';
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface Gotra {
  id: string;
  name: string;
  status: 'approved' | 'pending';
  created_at: string;
}

export interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: UserProfile;
}
