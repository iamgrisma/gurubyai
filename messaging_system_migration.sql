-- ==========================================
-- COMPLETE MESSAGING SYSTEM MIGRATION
-- ==========================================

-- Drop conflicting triggers and functions from previous migrations
DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
DROP FUNCTION IF EXISTS public.handle_booking_status_message();
DROP FUNCTION IF EXISTS public.create_booking_message(uuid, text, jsonb);

-- 1. CREATE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text CHECK (message_type IN (
    'text', 
    'booking_created', 
    'booking_confirmed', 
    'booking_cancelled',
    'booking_completed',
    'time_proposed',
    'time_accepted',
    'time_rejected',
    'custom_service_requested',
    'payment_received',
    'credit_approved',
    'credit_rejected'
  )) DEFAULT 'text',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT 
USING (
  sender_id = (SELECT auth.uid()) OR 
  receiver_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
CREATE POLICY "Users can update their received messages" 
ON public.messages FOR UPDATE 
USING (receiver_id = (SELECT auth.uid()));

-- 2. CREATE CONVERSATIONS VIEW
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

-- 3. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text CHECK (notification_type IN (
    'info',
    'success',
    'warning',
    'error',
    'booking',
    'payment',
    'credit',
    'system'
  )) DEFAULT 'info',
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 4. RPC FUNCTION: Send Message
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

-- 5. RPC FUNCTION: Mark Message as Read
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

-- 6. RPC FUNCTION: Mark All Messages as Read
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

-- 7. RPC FUNCTION: Mark Notification as Read
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

-- 8. ENHANCED BOOKING MESSAGE FUNCTION
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

  -- Determine sender, receiver, and message content
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

-- 9. TRIGGER: Auto-create messages on booking events
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

-- 10. RPC FUNCTION: Approve Credit Request with Messaging
CREATE OR REPLACE FUNCTION public.approve_credit_request(
  p_request_id uuid,
  p_new_amount integer
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
  FROM public.credit_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit request not found';
  END IF;

  -- Update request
  UPDATE public.credit_requests
  SET status = 'approved',
      admin_adjusted_amount = p_new_amount,
      processed_at = now(),
      processed_by = auth.uid()
  WHERE id = p_request_id;

  -- Add credits to user
  UPDATE public.profiles
  SET credits = credits + p_new_amount
  WHERE id = v_request.user_id;

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
    'Credit Request Approved',
    'Your credit request has been approved. ' || p_new_amount || ' credits have been added to your account.',
    'credit',
    jsonb_build_object('amount', p_new_amount, 'request_id', p_request_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_credit_request(uuid, integer) TO authenticated;

-- 11. RPC FUNCTION: Reject Credit Request with Messaging
CREATE OR REPLACE FUNCTION public.reject_credit_request(
  p_request_id uuid,
  p_reason text
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
  FROM public.credit_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit request not found';
  END IF;

  -- Update request
  UPDATE public.credit_requests
  SET status = 'rejected',
      rejection_reason = p_reason,
      processed_at = now(),
      processed_by = auth.uid()
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
    'Credit Request Rejected',
    'Your credit request was not approved.' || 
    CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
    'credit',
    jsonb_build_object('request_id', p_request_id, 'reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_credit_request(uuid, text) TO authenticated;

-- End of messaging migration
