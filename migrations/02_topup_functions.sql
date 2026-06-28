-- Migration: Add top-up request approval/rejection RPC functions

CREATE OR REPLACE FUNCTION public.approve_topup_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_request record;
BEGIN
    -- Security check: Ensure only admin can execute
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: only administrators can approve top-up requests';
    END IF;

    -- Fetch request and lock the row to avoid race conditions
    SELECT * INTO r_request
    FROM public.topup_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Top-up request not found';
    END IF;

    IF r_request.status != 'pending' THEN
        RAISE EXCEPTION 'Top-up request has already been processed';
    END IF;

    -- Update status
    UPDATE public.topup_requests
    SET status = 'approved'
    WHERE id = p_request_id;

    -- Add credits to the user's profile
    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + r_request.amount
    WHERE id = r_request.user_id;

    -- Log transaction
    INSERT INTO public.transactions (user_id, amount, type, description, status)
    VALUES (r_request.user_id, r_request.amount, 'credit', 'Wallet top-up approval', 'completed');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_topup_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_request record;
BEGIN
    -- Security check: Ensure only admin can execute
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: only administrators can reject top-up requests';
    END IF;

    SELECT * INTO r_request
    FROM public.topup_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Top-up request not found';
    END IF;

    IF r_request.status != 'pending' THEN
        RAISE EXCEPTION 'Top-up request has already been processed';
    END IF;

    -- Update status
    UPDATE public.topup_requests
    SET status = 'rejected'
    WHERE id = p_request_id;
END;
$$;


-- Fix handle_booking_messages trigger to prevent crash on unhandled status transitions
CREATE OR REPLACE FUNCTION public.handle_booking_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      ELSE
        -- Prevent CASE_NOT_FOUND error by doing nothing for other statuses (e.g. 'pending')
        NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

