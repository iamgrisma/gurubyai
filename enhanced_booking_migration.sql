-- ==========================================
-- ENHANCED BOOKING SYSTEM MIGRATION
-- ==========================================

-- 1. CREATE CUSTOM SERVICES TABLE
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

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_custom_services_expires 
ON public.custom_services(expires_at) 
WHERE status = 'pending';

-- Index for user's custom services
CREATE INDEX IF NOT EXISTS idx_custom_services_user 
ON public.custom_services(user_id);

-- RLS for custom_services
ALTER TABLE public.custom_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own custom services" ON public.custom_services;
CREATE POLICY "Users can view own custom services" 
ON public.custom_services FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create custom services" ON public.custom_services;
CREATE POLICY "Users can create custom services" 
ON public.custom_services FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all custom services" ON public.custom_services;
CREATE POLICY "Admins can view all custom services" 
ON public.custom_services FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update custom services" ON public.custom_services;
CREATE POLICY "Admins can update custom services" 
ON public.custom_services FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- 2. CREATE BOOKING SERVICES TABLE (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.booking_services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  custom_service_id uuid REFERENCES public.custom_services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Ensure either service_id OR custom_service_id is set, not both
  CHECK (
    (service_id IS NOT NULL AND custom_service_id IS NULL) OR
    (service_id IS NULL AND custom_service_id IS NOT NULL)
  )
);

-- Index for efficient booking service lookups
CREATE INDEX IF NOT EXISTS idx_booking_services_booking 
ON public.booking_services(booking_id);

-- RLS for booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view booking services" ON public.booking_services;
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

DROP POLICY IF EXISTS "Users can insert booking services" ON public.booking_services;
CREATE POLICY "Users can insert booking services" 
ON public.booking_services FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_services.booking_id 
    AND user_id = (SELECT auth.uid())
  )
);

-- 3. UPDATE BOOKINGS TABLE
DO $$
BEGIN
  -- Add guruba_name for custom bookings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'guruba_name'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN guruba_name text;
  END IF;

  -- Add is_custom_booking flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'is_custom_booking'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN is_custom_booking boolean DEFAULT false;
  END IF;

  -- Add booking_note for custom messages
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booking_note'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN booking_note text;
  END IF;
END $$;

-- Make guruba_id and service_id nullable for custom bookings
ALTER TABLE public.bookings ALTER COLUMN guruba_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN service_id DROP NOT NULL;

-- 4. CLEANUP FUNCTION FOR EXPIRED CUSTOM SERVICES
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

-- 5. RPC FUNCTION: Create Custom Service Request
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

-- 6. RPC FUNCTION: Approve Custom Service
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
  v_user_id uuid;
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
      0, -- Admin can set price later
      'Custom'
    )
    RETURNING id INTO v_service_id;
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_custom_service.user_id,
    'Custom Service Approved',
    'Your custom service request "' || v_custom_service.title || '" has been approved.'
  );

  RETURN COALESCE(v_service_id, p_custom_service_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_custom_service(uuid, boolean) TO authenticated;

-- 7. RPC FUNCTION: Reject Custom Service
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
    'Your custom service request "' || v_custom_service.title || '" was not approved.' ||
    CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_custom_service(uuid, text) TO authenticated;

-- 8. HELPER FUNCTION: Create Booking Message
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
BEGIN
  -- Get booking details
  SELECT b.*, p.full_name as user_name, g.user_id as guruba_user_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.gurubas g ON g.id = b.guruba_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Determine sender and receiver based on message type
  CASE p_message_type
    WHEN 'proposed_time' THEN
      v_sender_id := v_booking.guruba_user_id;
      v_receiver_id := v_booking.user_id;
      v_message_content := 'Guruba proposed a different time: ' || 
        to_char(v_booking.proposed_time, 'HH12:MI AM, DD Mon YYYY');
    
    WHEN 'booking_confirmed' THEN
      v_sender_id := v_booking.guruba_user_id;
      v_receiver_id := v_booking.user_id;
      v_message_content := 'Booking confirmed for ' || 
        to_char(v_booking.scheduled_at, 'HH12:MI AM, DD Mon YYYY');
    
    WHEN 'booking_cancelled' THEN
      v_sender_id := COALESCE(v_booking.guruba_user_id, v_booking.user_id);
      v_receiver_id := CASE 
        WHEN v_sender_id = v_booking.user_id THEN v_booking.guruba_user_id 
        ELSE v_booking.user_id 
      END;
      v_message_content := 'Booking has been cancelled';
    
    WHEN 'custom_service_requested' THEN
      v_sender_id := v_booking.user_id;
      v_receiver_id := v_booking.guruba_user_id;
      v_message_content := 'Requested custom service: ' || (p_additional_data->>'service_name');
    
    ELSE
      v_message_content := p_additional_data->>'message';
      v_sender_id := auth.uid();
      v_receiver_id := CASE 
        WHEN v_sender_id = v_booking.user_id THEN v_booking.guruba_user_id 
        ELSE v_booking.user_id 
      END;
  END CASE;

  -- Insert message
  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES (v_sender_id, v_receiver_id, v_message_content)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_message(uuid, text, jsonb) TO authenticated;

-- 9. TRIGGER: Auto-create message on booking status change
CREATE OR REPLACE FUNCTION public.handle_booking_status_message()
RETURNS trigger AS $$
BEGIN
  -- Only create message if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        PERFORM public.create_booking_message(NEW.id, 'booking_confirmed');
      WHEN 'cancelled' THEN
        PERFORM public.create_booking_message(NEW.id, 'booking_cancelled');
      WHEN 'awaiting_client_confirmation' THEN
        PERFORM public.create_booking_message(NEW.id, 'proposed_time');
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_status_message();

-- End of migration
