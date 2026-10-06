-- Booking flow repair:
-- - Centralize slot calculation so RLS cannot hide existing bookings from clients.
-- - Support 30-minute slot increments.
-- - Treat NULL/0 service duration as flexible/custom scheduling.
-- - Enforce service ownership, availability, conflict checks, and the platform fee in the database.
-- - Keep SECURITY DEFINER functions tightly scoped and explicitly granted.

create or replace function public.get_available_booking_slots(
  p_guruba_id uuid,
  p_service_id uuid,
  p_date date
)
returns table(slot_time text)
language sql
security definer
stable
set search_path = ''
as $function$
  with service_config as (
    select
      s.duration_minutes,
      a.start_time,
      a.end_time
    from public.services s
    join public.guruba_services gs
      on gs.service_id = s.id
     and gs.guruba_id = p_guruba_id
    join public.guruba_availability a
      on a.guruba_id = gs.guruba_id
     and a.day_of_week = extract(dow from p_date)::integer
    where s.id = p_service_id
      and s.duration_minutes is not null
      and s.duration_minutes > 0
    limit 1
  ),
  candidates as (
    select
      gs as slot_local,
      sc.duration_minutes
    from service_config sc
    cross join lateral generate_series(
      p_date::timestamp + sc.start_time,
      p_date::timestamp + sc.end_time - make_interval(mins => sc.duration_minutes),
      interval '30 minutes'
    ) gs
  )
  select to_char(c.slot_local, 'HH24:MI') as slot_time
  from candidates c
  where
    (
      p_date > (now() at time zone 'Asia/Kathmandu')::date
      or c.slot_local > (now() at time zone 'Asia/Kathmandu') + interval '1 hour'
    )
    and not exists (
      select 1
      from public.bookings b
      join public.services bs on bs.id = b.service_id
      where b.guruba_id = p_guruba_id
        and b.status in ('pending','confirmed','awaiting_client_confirmation')
        and b.scheduled_at is not null
        and (b.scheduled_at at time zone 'Asia/Kathmandu')::date = p_date
        and c.slot_local < (b.scheduled_at at time zone 'Asia/Kathmandu')
                          + make_interval(mins => greatest(coalesce(bs.duration_minutes, 60), 30) + 30)
        and c.slot_local + make_interval(mins => c.duration_minutes)
              > (b.scheduled_at at time zone 'Asia/Kathmandu')
    )
  order by c.slot_local;
$function$;

revoke execute on function public.get_available_booking_slots(uuid,uuid,date) from public, authenticated;
grant execute on function public.get_available_booking_slots(uuid,uuid,date) to anon, authenticated;

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
  v_status text;
  v_service_duration integer;
  v_platform_fee constant integer := 10;
  v_local_scheduled timestamp;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_scheduled_at is null and p_proposed_time is null then
    raise exception 'A scheduled or proposed time is required';
  end if;

  if not exists (select 1 from public.gurubas where id = p_guruba_id) then
    raise exception 'Guruba not found';
  end if;

  if not exists (
    select 1 from public.guruba_services
    where guruba_id = p_guruba_id and service_id = p_service_id
  ) then
    raise exception 'This Guruba does not offer the selected service';
  end if;

  select s.duration_minutes into v_service_duration
  from public.services s
  where s.id = p_service_id;

  if v_service_duration is null then
    raise exception 'This service needs custom scheduling';
  end if;

  if p_scheduled_at is not null then
    v_local_scheduled := p_scheduled_at at time zone 'Asia/Kathmandu';

    if not exists (
      select 1
      from public.guruba_availability a
      where a.guruba_id = p_guruba_id
        and a.day_of_week = extract(dow from v_local_scheduled)::integer
        and v_local_scheduled::time >= a.start_time
        and (v_local_scheduled::time + make_interval(mins => v_service_duration)) <= a.end_time
    ) then
      raise exception 'Selected time is outside the Guruba availability';
    end if;

    if exists (
      select 1
      from public.bookings b
      join public.services bs on bs.id = b.service_id
      where b.guruba_id = p_guruba_id
        and b.status in ('pending','confirmed','awaiting_client_confirmation')
        and b.scheduled_at is not null
        and v_local_scheduled < (b.scheduled_at at time zone 'Asia/Kathmandu')
          + make_interval(mins => greatest(coalesce(bs.duration_minutes,60),30) + 30)
        and v_local_scheduled + make_interval(mins => v_service_duration)
          > (b.scheduled_at at time zone 'Asia/Kathmandu')
    ) then
      raise exception 'That time has just been booked. Please choose another slot';
    end if;
  end if;

  select credits into v_current_credits
  from public.profiles
  where id = p_user_id
  for update;

  if v_current_credits is null then raise exception 'Profile not found'; end if;
  if v_current_credits < v_platform_fee then raise exception 'Insufficient credits'; end if;

  v_status := case
    when p_scheduled_at is null and p_proposed_time is not null
      then 'awaiting_client_confirmation'
    else 'pending'
  end;

  update public.profiles
  set credits = credits - v_platform_fee
  where id = p_user_id;

  insert into public.bookings (
    user_id, guruba_id, service_id, scheduled_at, proposed_time, status,
    platform_fee, location_lat, location_lng, location_address,
    booking_note, is_custom_booking, is_online
  )
  values (
    p_user_id, p_guruba_id, p_service_id, p_scheduled_at, p_proposed_time, v_status,
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

create index if not exists idx_bookings_guruba_status_scheduled
  on public.bookings(guruba_id, status, scheduled_at);
create index if not exists idx_guruba_services_lookup
  on public.guruba_services(guruba_id, service_id);
create unique index if not exists uq_guruba_availability_day
  on public.guruba_availability(guruba_id, day_of_week);
