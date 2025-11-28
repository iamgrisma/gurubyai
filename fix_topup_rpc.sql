-- RPC to approve a top-up request
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

-- RPC to reject a top-up request
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
