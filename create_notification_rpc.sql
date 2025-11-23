-- Create notification RPC function
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_action_url text
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO notifications (
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
