-- ==========================================
-- GURUBYAI UPGRADE SCHEMA: CUSTOM BOOKINGS & NOTE
-- ==========================================

-- 1. Add missing columns and modify constraints on public.bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_custom_booking boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guruba_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_note text;
ALTER TABLE public.bookings ALTER COLUMN scheduled_at DROP NOT NULL;

-- 2. Create public.custom_services table if it doesn't exist
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

-- Create indexes for custom_services if they don't exist
CREATE INDEX IF NOT EXISTS idx_custom_services_expires 
ON public.custom_services(expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_custom_services_user 
ON public.custom_services(user_id);

-- Enable RLS on custom_services
ALTER TABLE public.custom_services ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_services if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_services' AND policyname = 'Users can view own custom services') THEN
    CREATE POLICY "Users can view own custom services" 
    ON public.custom_services FOR SELECT 
    USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_services' AND policyname = 'Users can create custom services') THEN
    CREATE POLICY "Users can create custom services" 
    ON public.custom_services FOR INSERT 
    WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_services' AND policyname = 'Admins can view all custom services') THEN
    CREATE POLICY "Admins can view all custom services" 
    ON public.custom_services FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_services' AND policyname = 'Admins can update custom services') THEN
    CREATE POLICY "Admins can update custom services" 
    ON public.custom_services FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- 3. Create public.booking_services table if it doesn't exist
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

-- Create index for booking_services if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_booking_services_booking 
ON public.booking_services(booking_id);

-- Enable RLS on booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_services if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_services' AND policyname = 'Users can view booking services') THEN
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_services' AND policyname = 'Users can insert booking services') THEN
    CREATE POLICY "Users can insert booking services" 
    ON public.booking_services FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE id = booking_services.booking_id 
        AND user_id = (SELECT auth.uid())
      )
    );
  END IF;
END $$;
