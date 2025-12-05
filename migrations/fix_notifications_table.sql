-- Fix missing columns in notifications table
DO $$
BEGIN
  -- Add notification_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'notification_type') THEN
    ALTER TABLE public.notifications ADD COLUMN notification_type text CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'booking', 'payment', 'credit', 'system')) DEFAULT 'info';
  END IF;

  -- Add action_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url text;
  END IF;

  -- Add metadata if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add read_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read_at') THEN
    ALTER TABLE public.notifications ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Re-run the verification function just to be sure it's up to date
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
  -- Get guruba record
  SELECT id INTO v_guruba_id 
  FROM public.gurubas 
  WHERE user_id = auth.uid();
  
  IF v_guruba_id IS NULL THEN
    RAISE EXCEPTION 'User is not a guruba';
  END IF;
  
  -- Mark verification as requested
  UPDATE public.gurubas
  SET verification_requested_at = now()
  WHERE id = v_guruba_id;
  
  -- Get user name
  SELECT full_name INTO v_name 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Notify all admins
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
