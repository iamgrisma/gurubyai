-- ==========================================
-- GURUBYAI DATABASE SCHEMA SETUP
-- Supabase PostgreSQL Database
-- ==========================================
-- This file contains all table schemas, RLS policies, functions, and triggers
-- Run this file first before dataseeder.sql

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

-- 2.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  role text CHECK (role IN ('client', 'guruba', 'admin')) DEFAULT 'client',
  phone text,
  gotra_id text,
  avatar_url text,
  city text,
  languages text[],
  credits integer DEFAULT 100,
  latitude double precision,
  longitude double precision,
  address text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add location columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'latitude') THEN
    ALTER TABLE public.profiles ADD COLUMN latitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'longitude') THEN
    ALTER TABLE public.profiles ADD COLUMN longitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address') THEN
    ALTER TABLE public.profiles ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'credits') THEN
    ALTER TABLE public.profiles ADD COLUMN credits integer DEFAULT 100;
  END IF;
END $$;

-- Update existing users to have default credits
UPDATE public.profiles SET credits = 100 WHERE credits IS NULL;

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 2.2 SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  duration_minutes integer,
  base_price integer,
  image_url text,
  category text DEFAULT 'General',
  is_featured boolean DEFAULT false,
  is_online_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'category') THEN
    ALTER TABLE public.services ADD COLUMN category text DEFAULT 'General';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'is_featured') THEN
    ALTER TABLE public.services ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'is_online_enabled') THEN
    ALTER TABLE public.services ADD COLUMN is_online_enabled boolean DEFAULT false;
  END IF;
  -- Add unique constraint on title to prevent duplicate seeding
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_title_key') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_title_key UNIQUE (title);
  END IF;
END $$;

-- RLS for Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" 
ON public.services FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 2.3 GURUBAS TABLE
CREATE TABLE IF NOT EXISTS public.gurubas (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bio text,
  years_experience integer DEFAULT 0,
  rating numeric(2,1) DEFAULT 5.0,
  location text,
  specialties text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  guruba_type text DEFAULT 'brahmin',
  languages text[] DEFAULT '{}',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint and missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gurubas_user_id_key') THEN
    ALTER TABLE public.gurubas ADD CONSTRAINT gurubas_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'languages') THEN
    ALTER TABLE public.gurubas ADD COLUMN languages text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'guruba_type') THEN
    ALTER TABLE public.gurubas ADD COLUMN guruba_type text DEFAULT 'brahmin';
  END IF;
END $$;

-- RLS for Gurubas
ALTER TABLE public.gurubas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gurubas are viewable by everyone" ON public.gurubas;
CREATE POLICY "Gurubas are viewable by everyone" 
ON public.gurubas FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gurubas can update own details" ON public.gurubas;
CREATE POLICY "Gurubas can update own details" 
ON public.gurubas FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Gurubas can insert own profile" ON public.gurubas;
CREATE POLICY "Gurubas can insert own profile" 
ON public.gurubas FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update gurubas" ON public.gurubas;
CREATE POLICY "Admins can update gurubas" 
ON public.gurubas FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 2.4 GURUBA SERVICES (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.guruba_services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  guruba_id uuid REFERENCES public.gurubas(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  is_online boolean DEFAULT false,
  custom_price numeric,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(guruba_id, service_id)
);

-- RLS for Guruba Services
ALTER TABLE public.guruba_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guruba services public view" ON public.guruba_services;
CREATE POLICY "Guruba services public view" 
ON public.guruba_services FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gurubas manage own services" ON public.guruba_services;
CREATE POLICY "Gurubas manage own services" 
ON public.guruba_services FOR ALL 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = guruba_services.guruba_id
  )
);

-- 2.5 GURUBA AVAILABILITY
CREATE TABLE IF NOT EXISTS public.guruba_availability (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  guruba_id uuid REFERENCES public.gurubas(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(guruba_id, day_of_week)
);

-- RLS for Availability
ALTER TABLE public.guruba_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Availability is viewable by everyone" ON public.guruba_availability;
CREATE POLICY "Availability is viewable by everyone" 
ON public.guruba_availability FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gurubas manage own availability" ON public.guruba_availability;
CREATE POLICY "Gurubas manage own availability" 
ON public.guruba_availability FOR ALL 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = guruba_availability.guruba_id
  )
);

-- ==========================================
-- 3. BOOKING SYSTEM TABLES
-- ==========================================

-- 3.1 BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  guruba_id uuid REFERENCES public.gurubas(id),
  service_id uuid REFERENCES public.services(id),
  scheduled_at timestamptz NOT NULL,
  status text CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'awaiting_client_confirmation')) DEFAULT 'pending',
  proposed_time timestamptz,
  confirmation_deadline timestamptz,
  platform_fee integer DEFAULT 0,
  meeting_link text,
  location_lat double precision,
  location_lng double precision,
  location_address text,
  guruba_name text,
  is_custom_booking boolean DEFAULT false,
  booking_note text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'proposed_time') THEN
    ALTER TABLE public.bookings ADD COLUMN proposed_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'confirmation_deadline') THEN
    ALTER TABLE public.bookings ADD COLUMN confirmation_deadline timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'platform_fee') THEN
    ALTER TABLE public.bookings ADD COLUMN platform_fee integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'meeting_link') THEN
    ALTER TABLE public.bookings ADD COLUMN meeting_link text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location_lat') THEN
    ALTER TABLE public.bookings ADD COLUMN location_lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location_lng') THEN
    ALTER TABLE public.bookings ADD COLUMN location_lng double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location_address') THEN
    ALTER TABLE public.bookings ADD COLUMN location_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guruba_name') THEN
    ALTER TABLE public.bookings ADD COLUMN guruba_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'is_custom_booking') THEN
    ALTER TABLE public.bookings ADD COLUMN is_custom_booking boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_note') THEN
    ALTER TABLE public.bookings ADD COLUMN booking_note text;
  END IF;
END $$;

-- Make guruba_id and service_id nullable for custom bookings
ALTER TABLE public.bookings ALTER COLUMN guruba_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN service_id DROP NOT NULL;

-- RLS for Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can view own bookings\" ON public.bookings;
CREATE POLICY \"Users can view own bookings\" 
ON public.bookings FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Gurubas can view assigned bookings\" ON public.bookings;
CREATE POLICY \"Gurubas can view assigned bookings\" 
ON public.bookings FOR SELECT 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = bookings.guruba_id
  )
);

DROP POLICY IF EXISTS \"Users can create bookings\" ON public.bookings;
CREATE POLICY \"Users can create bookings\" 
ON public.bookings FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Gurubas can update assigned bookings\" ON public.bookings;
CREATE POLICY \"Gurubas can update assigned bookings\" 
ON public.bookings FOR UPDATE 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = bookings.guruba_id
  )
);

DROP POLICY IF EXISTS \"Users can update own bookings\" ON public.bookings;
CREATE POLICY \"Users can update own bookings\" 
ON public.bookings FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Admins can manage bookings\" ON public.bookings;
CREATE POLICY \"Admins can manage bookings\" 
ON public.bookings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 3.2 CUSTOM SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.custom_services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_duration_minutes integer DEFAULT 60,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '5 days') NOT NULL,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz
);

-- Indexes for custom services
CREATE INDEX IF NOT EXISTS idx_custom_services_expires 
ON public.custom_services(expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_custom_services_user 
ON public.custom_services(user_id);

-- RLS for custom_services
ALTER TABLE public.custom_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can view own custom services\" ON public.custom_services;
CREATE POLICY \"Users can view own custom services\" 
ON public.custom_services FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Users can create custom services\" ON public.custom_services;
CREATE POLICY \"Users can create custom services\" 
ON public.custom_services FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Admins can view all custom services\" ON public.custom_services;
CREATE POLICY \"Admins can view all custom services\" 
ON public.custom_services FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS \"Admins can update custom services\" ON public.custom_services;
CREATE POLICY \"Admins can update custom services\" 
ON public.custom_services FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 3.3 BOOKING SERVICES (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.booking_services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  custom_service_id uuid REFERENCES public.custom_services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (
    (service_id IS NOT NULL AND custom_service_id IS NULL) OR
    (service_id IS NULL AND custom_service_id IS NOT NULL)
  )
);

-- Index for booking services
CREATE INDEX IF NOT EXISTS idx_booking_services_booking 
ON public.booking_services(booking_id);

-- RLS for booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can view booking services\" ON public.booking_services;
CREATE POLICY \"Users can view booking services\" 
ON public.booking_services FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_services.booking_id 
    AND (user_id = (SELECT auth.uid()) OR 
         guruba_id IN (SELECT id FROM public.gurubas WHERE user_id = (SELECT auth.uid())))
  )
);

DROP POLICY IF EXISTS \"Users can insert booking services\" ON public.booking_services;
CREATE POLICY \"Users can insert booking services\" 
ON public.booking_services FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_services.booking_id 
    AND user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 4. COMMUNICATION TABLES
-- ==========================================

-- 4.1 MESSAGES TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text CHECK (message_type IN (
    'text', 'booking_created', 'booking_confirmed', 'booking_cancelled',
    'booking_completed', 'time_proposed', 'time_accepted', 'time_rejected',
    'custom_service_requested', 'payment_received', 'credit_approved', 'credit_rejected'
  )) DEFAULT 'text',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  retention_hours integer,
  seen_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'booking_id') THEN
    ALTER TABLE public.messages ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type') THEN
    ALTER TABLE public.messages ADD COLUMN message_type text DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'metadata') THEN
    ALTER TABLE public.messages ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE public.messages ADD COLUMN read_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'retention_hours') THEN
    ALTER TABLE public.messages ADD COLUMN retention_hours integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'seen_at') THEN
    ALTER TABLE public.messages ADD COLUMN seen_at timestamptz;
  END IF;
END $$;

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can view their own messages\" ON public.messages;
DROP POLICY IF EXISTS \"Users can view their messages\" ON public.messages;
CREATE POLICY \"Users can view their messages\" 
ON public.messages FOR SELECT 
USING (
  sender_id = (SELECT auth.uid()) OR 
  receiver_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS \"Users can send messages\" ON public.messages;
CREATE POLICY \"Users can send messages\" 
ON public.messages FOR INSERT 
WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS \"Users can update messages (read/seen)\" ON public.messages;
DROP POLICY IF EXISTS \"Users can update their received messages\" ON public.messages;
CREATE POLICY \"Users can update their received messages\" 
ON public.messages FOR UPDATE 
USING (receiver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS \"Users can delete own messages\" ON public.messages;
CREATE POLICY \"Users can delete own messages\" 
ON public.messages FOR DELETE 
USING (sender_id = (SELECT auth.uid()));

-- 4.2 NOTIFICATIONS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text CHECK (notification_type IN (
    'info', 'success', 'warning', 'error', 'booking', 'payment', 'credit', 'system'
  )) DEFAULT 'info',
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'notification_type') THEN
    ALTER TABLE public.notifications ADD COLUMN notification_type text DEFAULT 'info';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read_at') THEN
    ALTER TABLE public.notifications ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can view own notifications\" ON public.notifications;
DROP POLICY IF EXISTS \"Users manage own notifications\" ON public.notifications;
CREATE POLICY \"Users can view own notifications\" 
ON public.notifications FOR SELECT 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS \"Users can update own notifications\" ON public.notifications;
CREATE POLICY \"Users can update own notifications\" 
ON public.notifications FOR UPDATE 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS \"System can create notifications\" ON public.notifications;
DROP POLICY IF EXISTS \"Admins manage notifications\" ON public.notifications;
CREATE POLICY \"System can create notifications\" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 4.3 CONVERSATIONS VIEW
CREATE OR REPLACE VIEW public.conversations AS
SELECT DISTINCT
  CASE 
    WHEN m.sender_id = auth.uid() THEN m.receiver_id
    ELSE m.sender_id
  END as other_user_id,
  p.full_name as other_user_name,
  p.avatar_url as other_user_avatar,
  (
    SELECT content 
    FROM public.messages m2 
    WHERE (m2.sender_id = auth.uid() AND m2.receiver_id = other_user_id) 
       OR (m2.receiver_id = auth.uid() AND m2.sender_id = other_user_id)
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message,
  (
    SELECT created_at 
    FROM public.messages m2 
    WHERE (m2.sender_id = auth.uid() AND m2.receiver_id = other_user_id) 
       OR (m2.receiver_id = auth.uid() AND m2.sender_id = other_user_id)
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message_at,
  (
    SELECT COUNT(*) 
    FROM public.messages m2 
    WHERE m2.receiver_id = auth.uid() 
      AND m2.sender_id = other_user_id 
      AND m2.is_read = false
  ) as unread_count
FROM public.messages m
JOIN public.profiles p ON p.id = CASE 
  WHEN m.sender_id = auth.uid() THEN m.receiver_id
  ELSE m.sender_id
END
WHERE m.sender_id = auth.uid() OR m.receiver_id = auth.uid()
ORDER BY last_message_at DESC;

-- ==========================================
-- 5. SUPPORTING TABLES
-- ==========================================

-- 5.1 REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  guruba_id uuid REFERENCES public.gurubas(id) NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(booking_id)
);

-- RLS for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Reviews are viewable by everyone\" ON public.reviews;
CREATE POLICY \"Reviews are viewable by everyone\" 
ON public.reviews FOR SELECT 
USING (true);

DROP POLICY IF EXISTS \"Users can create reviews for their bookings\" ON public.reviews;
CREATE POLICY \"Users can create reviews for their bookings\" 
ON public.reviews FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5.2 TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  amount numeric,
  type text CHECK (type IN ('credit', 'debit')),
  description text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users view own transactions\" ON public.transactions;
CREATE POLICY \"Users view own transactions\" 
ON public.transactions FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Admins view all transactions\" ON public.transactions;
CREATE POLICY \"Admins view all transactions\" 
ON public.transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 5.3 GOTRAS TABLE
CREATE TABLE IF NOT EXISTS public.gotras (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  status text CHECK (status IN ('approved', 'pending')) DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Gotras
ALTER TABLE public.gotras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Gotras are viewable by authenticated users\" ON public.gotras;
CREATE POLICY \"Gotras are viewable by authenticated users\" 
ON public.gotras FOR SELECT 
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS \"Authenticated users can request gotras\" ON public.gotras;
CREATE POLICY \"Authenticated users can request gotras\" 
ON public.gotras FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS \"Admins can manage gotras\" ON public.gotras;
CREATE POLICY \"Admins can manage gotras\" 
ON public.gotras FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 5.4 TOPUP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  amount integer NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Topup Requests
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users can see and create own topups\" ON public.topup_requests;
CREATE POLICY \"Users can see and create own topups\" 
ON public.topup_requests FOR ALL 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS \"Admins can manage topups\" ON public.topup_requests;
CREATE POLICY \"Admins can manage topups\" 
ON public.topup_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 5.5 SAVED LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Saved Locations
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS \"Users manage own saved locations\" ON public.saved_locations;
CREATE POLICY \"Users manage own saved locations\" 
ON public.saved_locations FOR ALL 
USING ((SELECT auth.uid()) = user_id);

-- 5.6 JOB QUEUE TABLE (for async processing)
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- RLS for Job Queue (no public access)
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 6. HELPER FUNCTIONS
-- ==========================================

-- 6.1 Check Admin Status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 6.2 Cleanup Expired Custom Services
CREATE OR REPLACE FUNCTION public.cleanup_expired_custom_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.custom_services
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

-- ==========================================
-- 7. TRIGGER FUNCTIONS
-- ==========================================

-- 7.1 Handle New User (Create Profile + Guruba if needed)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(NEW.raw_user_meta_data->>'role', 'client');
  
  INSERT INTO public.profiles (id, email, full_name, role, credits)
  VALUES (
    NEW.id, 
    NEW.email, 
    coalesce(NEW.raw_user_meta_data->>'full_name', 'New User'),
    v_role,
    100
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'guruba' THEN
    INSERT INTO public.gurubas (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7.2 Handle Booking Messages (Auto-create messages on booking events)
CREATE OR REPLACE FUNCTION public.handle_booking_messages()
RETURNS trigger AS $$
BEGIN
  -- On INSERT (new booking)
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.create_booking_message(NEW.id, 'booking_created');
  END IF;

  -- On UPDATE (status changes)
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        PERFORM public.create_booking_message(NEW.id, 'booking_confirmed');
      WHEN 'cancelled' THEN
        PERFORM public.create_booking_message(NEW.id, 'booking_cancelled');
      WHEN 'completed' THEN
        PERFORM public.create_booking_message(NEW.id, 'booking_completed');
      WHEN 'awaiting_client_confirmation' THEN
        PERFORM public.create_booking_message(NEW.id, 'time_proposed');
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_messages ON public.bookings;
CREATE TRIGGER on_booking_messages
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_messages();

-- 7.3 Handle Booking Notification (Job Queue Pattern)
CREATE OR REPLACE FUNCTION public.handle_booking_notification() 
RETURNS trigger AS $$
BEGIN
  -- Queue the notification job instead of direct insert
  INSERT INTO public.job_queue (job_type, payload)
  VALUES (
    'booking_notification',
    jsonb_build_object(
      'record_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', NEW.user_id,
      'guruba_id', NEW.guruba_id,
      'service_id', NEW.service_id,
      'proposed_time', NEW.proposed_time
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 Sync Specialties (Update guruba specialties based on services)
CREATE OR REPLACE FUNCTION public.sync_specialties()
RETURNS trigger AS $$
BEGIN
  UPDATE public.gurubas
  SET specialties = array(
    SELECT s.title
    FROM public.guruba_services gs
    JOIN public.services s ON s.id = gs.service_id
    WHERE gs.guruba_id = coalesce(NEW.guruba_id, OLD.guruba_id)
  )
  WHERE id = coalesce(NEW.guruba_id, OLD.guruba_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_guruba_service_change ON public.guruba_services;
CREATE TRIGGER on_guruba_service_change
  AFTER INSERT OR UPDATE OR DELETE ON public.guruba_services
  FOR EACH ROW EXECUTE PROCEDURE public.sync_specialties();

-- 7.5 Notify Admin on Topup Request
CREATE OR REPLACE FUNCTION public.notify_admin_on_topup()
RETURNS trigger AS $$
DECLARE
  v_admin_id uuid;
  v_user_name text;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      v_admin_id,
      'New Top-up Request',
      coalesce(v_user_name, 'User') || ' requested a top-up of ' || NEW.amount || ' Credits.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_topup_request ON public.topup_requests;
CREATE TRIGGER on_topup_request
  AFTER INSERT ON public.topup_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_on_topup();

-- ==========================================
-- 8. RPC FUNCTIONS
-- ==========================================

-- 8.1 BOOKING RPCs

-- Book Service
CREATE OR REPLACE FUNCTION public.book_service(
  p_user_id uuid,
  p_guruba_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamptz,
  p_platform_fee integer,
  p_location_lat double precision DEFAULT NULL,
  p_location_lng double precision DEFAULT NULL,
  p_location_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_current_credits integer;
BEGIN
  -- Check if user has enough credits
  SELECT credits INTO v_current_credits FROM public.profiles WHERE id = p_user_id;
  
  IF v_current_credits < p_platform_fee THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct credits
  UPDATE public.profiles 
  SET credits = credits - p_platform_fee 
  WHERE id = p_user_id;

  -- Create booking
  INSERT INTO public.bookings (
    user_id, 
    guruba_id, 
    service_id, 
    scheduled_at, 
    status, 
    platform_fee, 
    location_lat, 
    location_lng, 
    location_address
  )
  VALUES (
    p_user_id, 
    p_guruba_id, 
    p_service_id, 
    p_scheduled_at, 
    'pending', 
    p_platform_fee, 
    p_location_lat, 
    p_location_lng, 
    p_location_address
  )
  RETURNING id INTO v_booking_id;

  -- Log transaction if fee > 0
  IF p_platform_fee > 0 THEN
    INSERT INTO public.transactions (user_id, amount, type, description, status)
    VALUES (p_user_id, p_platform_fee, 'debit', 'Booking Fee for Service', 'completed');
  END IF;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_service(uuid, uuid, uuid, timestamptz, integer, double precision, double precision, text) TO authenticated;

-- 8.2 CUSTOM SERVICE RPCs

-- Create Custom Service Request
CREATE OR REPLACE FUNCTION public.create_custom_service_request(
  p_title text,
  p_description text,
  p_estimated_duration integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_admin_id uuid;
BEGIN
  -- Insert custom service request
  INSERT INTO public.custom_services (user_id, title, description, estimated_duration_minutes)
  VALUES (auth.uid(), p_title, p_description, p_estimated_duration)
  RETURNING id INTO v_service_id;

  -- Notify admins
  FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      v_admin_id,
      'New Custom Service Request',
      'User requested custom service: ' || p_title
    );
  END LOOP;

  RETURN v_service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_custom_service_request(text, text, integer) TO authenticated;

-- Approve Custom Service
CREATE OR REPLACE FUNCTION public.approve_custom_service(
  p_custom_service_id uuid,
  p_create_as_service boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_custom_service record;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get custom service details
  SELECT * INTO v_custom_service 
  FROM public.custom_services 
  WHERE id = p_custom_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Custom service not found';
  END IF;

  -- Update custom service status
  UPDATE public.custom_services
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_custom_service_id;

  -- Optionally create as a regular service
  IF p_create_as_service THEN
    INSERT INTO public.services (title, description, duration_minutes, base_price, category)
    VALUES (
      v_custom_service.title,
      v_custom_service.description,
      v_custom_service.estimated_duration_minutes,
      0,
      'Custom'
    )
    RETURNING id INTO v_service_id;
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_custom_service.user_id,
    'Custom Service Approved',
    'Your custom service request \"' || v_custom_service.title || '\" has been approved.'
  );

  RETURN COALESCE(v_service_id, p_custom_service_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_custom_service(uuid, boolean) TO authenticated;

-- Reject Custom Service
CREATE OR REPLACE FUNCTION public.reject_custom_service(
  p_custom_service_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custom_service record;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get custom service details
  SELECT * INTO v_custom_service 
  FROM public.custom_services 
  WHERE id = p_custom_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Custom service not found';
  END IF;

  -- Update status
  UPDATE public.custom_services
  SET status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_custom_service_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_custom_service.user_id,
    'Custom Service Request Rejected',
    'Your custom service request \"' || v_custom_service.title || '\" was not approved.' ||
    CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_custom_service(uuid, text) TO authenticated;

-- 8.3 MESSAGING RPCs

-- Send Message
CREATE OR REPLACE FUNCTION public.send_message(
  p_receiver_id uuid,
  p_content text,
  p_booking_id uuid DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO public.messages (
    sender_id,
    receiver_id,
    booking_id,
    content,
    message_type,
    metadata
  )
  VALUES (
    auth.uid(),
    p_receiver_id,
    p_booking_id,
    p_content,
    p_message_type,
    p_metadata
  )
  RETURNING id INTO v_message_id;

  -- Create notification for receiver
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    metadata
  )
  VALUES (
    p_receiver_id,
    'New Message',
    p_content,
    'info',
    jsonb_build_object('message_id', v_message_id, 'sender_id', auth.uid())
  );

  RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, uuid, text, jsonb) TO authenticated;

-- Mark Message as Read
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true,
      read_at = now()
  WHERE id = p_message_id
    AND receiver_id = auth.uid()
    AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;

-- Mark All Messages as Read
CREATE OR REPLACE FUNCTION public.mark_all_messages_read(p_sender_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true,
      read_at = now()
  WHERE receiver_id = auth.uid()
    AND sender_id = p_sender_id
    AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_messages_read(uuid) TO authenticated;

-- 8.4 NOTIFICATION RPCs

-- Create Notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_action_url text
) 
RETURNS void 
LANGUAGE sql 
AS $$
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    action_url,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_action_url,
    false,
    now()
  );
$$;

-- Mark Notification as Read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

-- 8.5 TOPUP RPCs

-- Approve Topup Request
CREATE OR REPLACE FUNCTION public.approve_topup_request(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Top-up request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  -- Update request status
  UPDATE public.topup_requests
  SET status = 'approved'
  WHERE id = p_request_id;

  -- Add credits to user profile
  UPDATE public.profiles
  SET credits = credits + v_request.amount
  WHERE id = v_request.user_id;

  -- Create transaction record
  INSERT INTO public.transactions (user_id, amount, type, description, status)
  VALUES (v_request.user_id, v_request.amount, 'credit', 'Top-up Request Approved', 'completed');

  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    metadata
  )
  VALUES (
    v_request.user_id,
    'Top-up Approved',
    'Your request for ' || v_request.amount || ' credits has been approved.',
    'credit',
    jsonb_build_object('amount', v_request.amount, 'request_id', p_request_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_topup_request(uuid) TO authenticated;

-- Reject Topup Request
CREATE OR REPLACE FUNCTION public.reject_topup_request(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  -- Check admin permission
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Top-up request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  -- Update request status
  UPDATE public.topup_requests
  SET status = 'rejected'
  WHERE id = p_request_id;

  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    metadata
  )
  VALUES (
    v_request.user_id,
    'Top-up Rejected',
    'Your request for ' || v_request.amount || ' credits was rejected.',
    'credit',
    jsonb_build_object('amount', v_request.amount, 'request_id', p_request_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_topup_request(uuid) TO authenticated;

-- 8.6 ADMIN RPCs

-- Admin Add Credits
CREATE OR REPLACE FUNCTION public.admin_add_credits(target_user_id uuid, amount numeric)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.profiles SET credits = credits + amount WHERE id = target_user_id;
  
  INSERT INTO public.transactions (user_id, amount, type, description, status)
  VALUES (target_user_id, amount, 'credit', 'Admin Top-up', 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, numeric) TO authenticated;

-- Request Verification
CREATE OR REPLACE FUNCTION public.request_verification()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = auth.uid();
  FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (v_admin_id, 'Verification Request', 'Guruba ' || coalesce(v_name, 'User') || ' requested verification.');
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_verification() TO authenticated;

-- 8.7 CREATE BOOKING MESSAGE (Complex function for booking messages)

CREATE OR REPLACE FUNCTION public.create_booking_message(
  p_booking_id uuid,
  p_message_type text,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_message_content text;
  v_message_id uuid;
  v_sender_id uuid;
  v_receiver_id uuid;
  v_notification_title text;
BEGIN
  -- Get booking details with service info
  SELECT 
    b.*,
    p.full_name as user_name,
    gp.full_name as guruba_name,
    g.user_id as guruba_user_id,
    s.title as service_title
  INTO v_booking
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.gurubas g ON g.id = b.guruba_id
  LEFT JOIN public.profiles gp ON gp.id = g.user_id
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Determine sender, receiver, and message content based on message type
  CASE p_message_type
    WHEN 'booking_created' THEN
      v_sender_id := v_booking.user_id;
      v_receiver_id := v_booking.guruba_user_id;
      v_notification_title := 'New Booking Request';
      v_message_content := v_booking.user_name || ' requested a booking for ' || 
        COALESCE(v_booking.service_title, 'custom service') || ' on ' ||
        to_char(v_booking.scheduled_at, 'DD Mon YYYY at HH12:MI AM');
    
    WHEN 'time_proposed' THEN
      v_sender_id := v_booking.guruba_user_id;
      v_receiver_id := v_booking.user_id;
      v_notification_title := 'Time Proposal';
      v_message_content := v_booking.guruba_name || ' proposed a different time: ' || 
        to_char(v_booking.proposed_time, 'DD Mon YYYY at HH12:MI AM');
    
    WHEN 'booking_confirmed' THEN
      v_sender_id := v_booking.guruba_user_id;
      v_receiver_id := v_booking.user_id;
      v_notification_title := 'Booking Confirmed';
      v_message_content := 'Your booking with ' || v_booking.guruba_name || 
        ' has been confirmed for ' || to_char(v_booking.scheduled_at, 'DD Mon YYYY at HH12:MI AM');
    
    WHEN 'booking_cancelled' THEN
      v_sender_id := COALESCE(
        NULLIF(p_additional_data->>'cancelled_by', '')::uuid,
        auth.uid()
      );
      v_receiver_id := CASE 
        WHEN v_sender_id = v_booking.user_id THEN v_booking.guruba_user_id 
        ELSE v_booking.user_id 
      END;
      v_notification_title := 'Booking Cancelled';
      v_message_content := 'Booking for ' || 
        to_char(v_booking.scheduled_at, 'DD Mon YYYY at HH12:MI AM') || 
        ' has been cancelled' ||
        CASE WHEN p_additional_data->>'reason' IS NOT NULL 
          THEN '. Reason: ' || (p_additional_data->>'reason')
          ELSE ''
        END;
    
    WHEN 'booking_completed' THEN
      v_sender_id := v_booking.guruba_user_id;
      v_receiver_id := v_booking.user_id;
      v_notification_title := 'Booking Completed';
      v_message_content := 'Your booking with ' || v_booking.guruba_name || ' has been completed. Thank you!';
    
    WHEN 'time_accepted' THEN
      v_sender_id := v_booking.user_id;
      v_receiver_id := v_booking.guruba_user_id;
      v_notification_title := 'Time Accepted';
      v_message_content := v_booking.user_name || ' accepted the proposed time';
    
    WHEN 'time_rejected' THEN
      v_sender_id := v_booking.user_id;
      v_receiver_id := v_booking.guruba_user_id;
      v_notification_title := 'Time Rejected';
      v_message_content := v_booking.user_name || ' rejected the proposed time';
    
    ELSE
      v_message_content := p_additional_data->>'message';
      v_notification_title := COALESCE(p_additional_data->>'title', 'Booking Update');
      v_sender_id := auth.uid();
      v_receiver_id := CASE 
        WHEN v_sender_id = v_booking.user_id THEN v_booking.guruba_user_id 
        ELSE v_booking.user_id 
      END;
  END CASE;

  -- Insert message
  INSERT INTO public.messages (
    sender_id,
    receiver_id,
    booking_id,
    content,
    message_type,
    metadata
  )
  VALUES (
    v_sender_id,
    v_receiver_id,
    p_booking_id,
    v_message_content,
    p_message_type,
    p_additional_data
  )
  RETURNING id INTO v_message_id;

  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    action_url,
    metadata
  )
  VALUES (
    v_receiver_id,
    v_notification_title,
    v_message_content,
    'booking',
    '/bookings/' || p_booking_id,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'message_id', v_message_id,
      'message_type', p_message_type
    )
  );

  RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_message(uuid, text, jsonb) TO authenticated;

-- ==========================================
-- 9. SECURITY HARDENING
-- ==========================================

-- Revoke direct insert permissions on sensitive tables
REVOKE INSERT ON public.messages FROM public, anon, authenticated;
REVOKE INSERT ON public.notifications FROM public, anon, authenticated;
REVOKE INSERT ON public.transactions FROM public, anon, authenticated;

-- Harden security definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_booking_notification() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_specialties() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_topup() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.book_service(uuid, uuid, uuid, timestamptz, int, double precision, double precision, text) FROM public, anon;

-- End of SQL setup
