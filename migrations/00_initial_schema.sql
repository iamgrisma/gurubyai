-- ==========================================
-- GURUBYAI INITIAL SCHEMA
-- ==========================================

-- File: 00_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- File: 01_profiles.sql
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 02_services.sql
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL UNIQUE,
  description text,
  duration_minutes integer,
  base_price integer,
  image_url text,
  category text DEFAULT 'General',
  is_featured boolean DEFAULT false,
  is_online_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage services" 
ON public.services FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 03_gurubas.sql
CREATE TABLE IF NOT EXISTS public.gurubas (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio text,
  years_experience integer DEFAULT 0,
  rating numeric(2,1) DEFAULT 5.0,
  location text,
  specialties text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  guruba_type text DEFAULT 'brahmin',
  languages text[] DEFAULT '{}',
  verification_requested_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gurubas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gurubas are viewable by everyone" 
ON public.gurubas FOR SELECT 
USING (true);

CREATE POLICY "Gurubas can update own details" 
ON public.gurubas FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Gurubas can insert own profile" 
ON public.gurubas FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can update gurubas" 
ON public.gurubas FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 04_guruba_services.sql
CREATE TABLE IF NOT EXISTS public.guruba_services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  guruba_id uuid REFERENCES public.gurubas(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  is_online boolean DEFAULT false,
  custom_price numeric,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(guruba_id, service_id)
);

ALTER TABLE public.guruba_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guruba services public view" 
ON public.guruba_services FOR SELECT 
USING (true);

CREATE POLICY "Gurubas manage own services" 
ON public.guruba_services FOR ALL 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = guruba_services.guruba_id
  )
);


-- File: 05_guruba_availability.sql
CREATE TABLE IF NOT EXISTS public.guruba_availability (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  guruba_id uuid REFERENCES public.gurubas(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(guruba_id, day_of_week)
);

ALTER TABLE public.guruba_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is viewable by everyone" 
ON public.guruba_availability FOR SELECT 
USING (true);

CREATE POLICY "Gurubas manage own availability" 
ON public.guruba_availability FOR ALL 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = guruba_availability.guruba_id
  )
);


-- File: 06_bookings.sql
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  guruba_id uuid REFERENCES public.gurubas(id),
  service_id uuid REFERENCES public.services(id),
  scheduled_at timestamptz,
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

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" 
ON public.bookings FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Gurubas can view assigned bookings" 
ON public.bookings FOR SELECT 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = bookings.guruba_id
  )
);

CREATE POLICY "Users can create bookings" 
ON public.bookings FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Gurubas can update assigned bookings" 
ON public.bookings FOR UPDATE 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.gurubas WHERE id = bookings.guruba_id
  )
);

CREATE POLICY "Users can update own bookings" 
ON public.bookings FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can manage bookings" 
ON public.bookings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 07_custom_services.sql
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

CREATE INDEX IF NOT EXISTS idx_custom_services_expires 
ON public.custom_services(expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_custom_services_user 
ON public.custom_services(user_id);

ALTER TABLE public.custom_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom services" 
ON public.custom_services FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create custom services" 
ON public.custom_services FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all custom services" 
ON public.custom_services FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Admins can update custom services" 
ON public.custom_services FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 08_booking_services.sql
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

CREATE INDEX IF NOT EXISTS idx_booking_services_booking 
ON public.booking_services(booking_id);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking services" 
ON public.booking_services FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_services.booking_id 
    AND (user_id = (SELECT auth.uid()) OR 
         guruba_id IN (SELECT id FROM public.gurubas WHERE user_id = (SELECT auth.uid())))
  )
);

CREATE POLICY "Users can insert booking services" 
ON public.booking_services FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_services.booking_id 
    AND user_id = (SELECT auth.uid())
  )
);


-- File: 09_messages.sql
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

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT 
USING (
  sender_id = (SELECT auth.uid()) OR 
  receiver_id = (SELECT auth.uid())
);

CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their received messages" 
ON public.messages FOR UPDATE 
USING (receiver_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own messages" 
ON public.messages FOR DELETE 
USING (sender_id = (SELECT auth.uid()));


-- File: 10_notifications.sql
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);


-- File: 11_reviews.sql
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

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for their bookings" 
ON public.reviews FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);


-- File: 12_transactions.sql
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  amount numeric,
  type text CHECK (type IN ('credit', 'debit')),
  description text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" 
ON public.transactions FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins view all transactions" 
ON public.transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 13_gotras.sql
CREATE TABLE IF NOT EXISTS public.gotras (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  status text CHECK (status IN ('approved', 'pending')) DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gotras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gotras are viewable by authenticated users" 
ON public.gotras FOR SELECT 
USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Authenticated users can request gotras" 
ON public.gotras FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Admins can manage gotras" 
ON public.gotras FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 14_topup_requests.sql
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  amount integer NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see and create own topups" 
ON public.topup_requests FOR ALL 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can manage topups" 
ON public.topup_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);


-- File: 15_saved_locations.sql
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved locations" 
ON public.saved_locations FOR ALL 
USING ((SELECT auth.uid()) = user_id);


-- File: 16_job_queue.sql
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;


-- File: 17_views.sql
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


-- File: 18_functions.sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.request_verification()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
  v_guruba_id uuid;
BEGIN
  SELECT id INTO v_guruba_id 
  FROM public.gurubas 
  WHERE user_id = auth.uid();
  
  IF v_guruba_id IS NULL THEN
    RAISE EXCEPTION 'User is not a guruba';
  END IF;
  
  UPDATE public.gurubas
  SET verification_requested_at = now()
  WHERE id = v_guruba_id;
  
  SELECT full_name INTO v_name 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  FOR v_admin_id IN 
    SELECT id FROM public.profiles WHERE role = 'admin' 
  LOOP
    INSERT INTO public.notifications (
      user_id, 
      title, 
      message,
      notification_type,
      action_url
    )
    VALUES (
      v_admin_id, 
      'Verification Request', 
      'Guruba ' || coalesce(v_name, 'User') || ' requested verification.',
      'system',
      '/admin?tab=verification'
    );
  END LOOP;
END;
$$;


