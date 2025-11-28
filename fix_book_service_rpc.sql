-- Re-create the function to ensure it exists and has the correct signature
CREATE OR REPLACE FUNCTION public.book_service(
  p_user_id uuid,
  p_guruba_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamp with time zone,
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

-- Explicitly grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.book_service(uuid, uuid, uuid, timestamptz, integer, double precision, double precision, text) TO authenticated;

-- Ensure schema cache is reloaded
NOTIFY pgrst, 'reload config';
