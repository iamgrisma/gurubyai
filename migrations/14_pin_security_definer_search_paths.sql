-- Pin legacy/internal SECURITY DEFINER search paths.
alter function public.update_guruba_rating() set search_path = '';
alter function public.create_booking_payment(uuid,uuid,uuid,timestamptz,integer) set search_path = '';
alter function public.top_up_wallet(uuid,integer) set search_path = '';
alter function public.create_booking_message(uuid,text,jsonb) set search_path = '';
alter function public.handle_booking_messages() set search_path = '';