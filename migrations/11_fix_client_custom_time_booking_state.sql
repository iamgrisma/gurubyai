-- Client-proposed custom times start as pending.
-- Guruba proposals use awaiting_client_confirmation later in the negotiation flow.

create or replace function public.book_service(
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
set search_path = ''
as $function$
declare
  v_booking_id uuid;
  v_current_credits integer;
  v_service_duration integer;
  v_platform_fee constant integer := 10;
  v_local_scheduled timestamp;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_user_id then raise exception 'Unauthorized'; end if;
  if p_scheduled_at is null and p_proposed_time is null then raise exception 'A scheduled or proposed time is required'; end if;
  if p_proposed_time is not null and p_proposed_time <= now() then raise exception 'The proposed time must be in the future'; end if;
  if p_scheduled_at is not null and p_scheduled_at <= now() then raise exception 'The scheduled time must be in the future'; end if;
  if not exists (select 1 from public.gurubas where id = p_guruba_id) then raise exception 'Guruba not found'; end if;
  if not exists (select 1 from public.guruba_services where guruba_id = p_guruba_id and service_id = p_service_id) then
    raise exception 'This Guruba does not offer the selected service';
  end if;

  select s.duration_minutes into v_service_duration from public.services s where s.id = p_service_id;

  if p_scheduled_at is not null then
    if v_service_duration is null then raise exception 'This service needs custom scheduling'; end if;
    v_local_scheduled := p_scheduled_at at time zone 'Asia/Kathmandu';

    if extract(minute from v_local_scheduled)::integer not in (0, 30)
       or extract(second from v_local_scheduled) <> 0 then
      raise exception 'Please choose a 30-minute booking slot';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_guruba_id::text || ':' || v_local_scheduled::date::text, 0));

    if not exists (
      select 1 from public.guruba_availability a
      where a.guruba_id = p_guruba_id
        and a.day_of_week = extract(dow from v_local_scheduled)::integer
        and v_local_scheduled::time >= a.start_time
        and (v_local_scheduled::time + make_interval(mins => v_service_duration)) <= a.end_time
    ) then raise exception 'Selected time is outside the Guruba availability'; end if;

    if exists (
      select 1 from public.bookings b
      join public.services bs on bs.id = b.service_id
      where b.guruba_id = p_guruba_id
        and b.status in ('pending','confirmed','awaiting_client_confirmation')
        and b.scheduled_at is not null
        and v_local_scheduled < (b.scheduled_at at time zone 'Asia/Kathmandu')
          + make_interval(mins => greatest(coalesce(bs.duration_minutes,60),30) + 30)
        and v_local_scheduled + make_interval(mins => v_service_duration)
          > (b.scheduled_at at time zone 'Asia/Kathmandu')
    ) then raise exception 'That time has just been booked. Please choose another slot'; end if;
  end if;

  select credits into v_current_credits from public.profiles where id = p_user_id for update;
  if v_current_credits is null then raise exception 'Profile not found'; end if;
  if v_current_credits < v_platform_fee then raise exception 'Insufficient credits'; end if;

  update public.profiles set credits = credits - v_platform_fee where id = p_user_id;

  insert into public.bookings (
    user_id, guruba_id, service_id, scheduled_at, proposed_time, status,
    platform_fee, location_lat, location_lng, location_address,
    booking_note, is_custom_booking, is_online
  )
  values (
    p_user_id, p_guruba_id, p_service_id, p_scheduled_at, p_proposed_time, 'pending',
    v_platform_fee, p_location_lat, p_location_lng, p_location_address,
    p_booking_note, p_is_custom_booking, p_is_online
  )
  returning id into v_booking_id;

  insert into public.transactions (user_id, amount, type, description, status)
  values (p_user_id, v_platform_fee, 'debit', 'Booking Fee for Service', 'completed');

  return v_booking_id;
end;
$function$;

revoke execute on function public.book_service(uuid,uuid,uuid,timestamptz,integer,double precision,double precision,text,timestamptz,text,boolean,boolean) from public, anon;
grant execute on function public.book_service(uuid,uuid,uuid,timestamptz,integer,double precision,double precision,text,timestamptz,text,boolean,boolean) to authenticated;
