-- Production hardening for the booking/payment path.
-- Applied to Supabase project axctxzjqnxbloxakhhmx.

drop function if exists public.book_service(uuid, uuid, uuid, timestamptz, integer, double precision, double precision, text);

create function public.book_service(
  p_user_id uuid,
  p_guruba_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamptz,
  p_platform_fee integer,
  p_location_lat double precision default null,
  p_location_lng double precision default null,
  p_location_address text default null,
  p_proposed_time timestamptz default null,
  p_booking_note text default null,
  p_is_custom_booking boolean default false,
  p_is_online boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_booking_id uuid;
  v_current_credits integer;
  v_status text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Unauthorized'; end if;
  if p_platform_fee < 0 then raise exception 'Invalid platform fee'; end if;
  if p_scheduled_at is null and p_proposed_time is null then raise exception 'A scheduled or proposed time is required'; end if;
  if not exists (select 1 from public.gurubas where id = p_guruba_id) then raise exception 'Guruba not found'; end if;
  if not exists (select 1 from public.services where id = p_service_id) then raise exception 'Service not found'; end if;

  select credits into v_current_credits from public.profiles where id = p_user_id for update;
  if v_current_credits is null then raise exception 'Profile not found'; end if;
  if v_current_credits < p_platform_fee then raise exception 'Insufficient credits'; end if;

  v_status := case when p_scheduled_at is null and p_proposed_time is not null
    then 'awaiting_client_confirmation' else 'pending' end;

  update public.profiles set credits = credits - p_platform_fee where id = p_user_id;

  insert into public.bookings (
    user_id, guruba_id, service_id, scheduled_at, proposed_time, status,
    platform_fee, location_lat, location_lng, location_address,
    booking_note, is_custom_booking, is_online
  ) values (
    p_user_id, p_guruba_id, p_service_id, p_scheduled_at, p_proposed_time, v_status,
    p_platform_fee, p_location_lat, p_location_lng, p_location_address,
    p_booking_note, p_is_custom_booking, p_is_online
  ) returning id into v_booking_id;

  if p_platform_fee > 0 then
    insert into public.transactions (user_id, amount, type, description, status)
    values (p_user_id, p_platform_fee, 'debit', 'Booking Fee for Service', 'completed');
  end if;

  return v_booking_id;
end;
$function$;

revoke execute on function public.book_service(uuid, uuid, uuid, timestamptz, integer, double precision, double precision, text, timestamptz, text, boolean, boolean) from public, anon;
grant execute on function public.book_service(uuid, uuid, uuid, timestamptz, integer, double precision, double precision, text, timestamptz, text, boolean, boolean) to authenticated;

create or replace function public.handle_booking_completion_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    if new.scheduled_at is null then raise exception 'Cannot complete a booking that has no scheduled date and time.'; end if;
    if new.scheduled_at > timezone('utc'::text, now()) then raise exception 'Cannot complete a booking before its scheduled date and time.'; end if;
  end if;
  return new;
end;
$function$;

revoke execute on function public.handle_booking_completion_credits() from public, anon, authenticated;
revoke execute on function public.approve_topup_request(uuid) from public, anon;
revoke execute on function public.reject_topup_request(uuid) from public, anon;
revoke execute on function public.create_booking_payment(uuid, uuid, uuid, timestamptz, integer) from public, anon;
revoke execute on function public.create_booking_message(uuid, text, jsonb) from public, anon;
revoke execute on function public.handle_booking_messages() from public, anon, authenticated;
revoke execute on function public.mark_notification_read(uuid) from public, anon;
revoke execute on function public.top_up_wallet(uuid, integer) from public, anon;
revoke execute on function public.update_guruba_rating() from public, anon, authenticated;
grant execute on function public.approve_topup_request(uuid) to authenticated;
grant execute on function public.reject_topup_request(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
