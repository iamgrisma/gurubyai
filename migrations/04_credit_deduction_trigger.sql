CREATE OR REPLACE FUNCTION handle_booking_completion_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Watertight date validation: Cannot complete booking before scheduled time
    IF NEW.scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Cannot complete a booking that has no scheduled date and time.';
    ELSIF NEW.scheduled_at > timezone('utc'::text, now()) THEN
      RAISE EXCEPTION 'Cannot complete a booking before its scheduled date and time.';
    END IF;

    -- Check if platform_fee is greater than 0
    IF NEW.platform_fee > 0 THEN
      -- Deduct credits from user
      UPDATE public.profiles
      SET credits = COALESCE(credits, 0) - NEW.platform_fee
      WHERE id = NEW.user_id;

      -- Add a transaction record
      INSERT INTO public.transactions (user_id, amount, type, description, status)
      VALUES (
        NEW.user_id, 
        NEW.platform_fee, 
        'debit', 
        'Payment for booking ' || NEW.id, 
        'completed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_completed_credits ON public.bookings;
CREATE TRIGGER on_booking_completed_credits
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_completion_credits();
