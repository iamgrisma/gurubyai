-- B4: booking idempotency, rescheduling and cancellation refunds.

begin;

alter table public.transactions
  add column if not exists reference_key text;

create unique index if not exists uq_transactions_reference_key
  on public.transactions(reference_key)
  where reference_key is not null;

create table if not exists public.booking_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  request_key text not null,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, request_key)
);

alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from anon, authenticated;

create or replace function public.book_service_idempotent(
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
  p_is_online boolean default false,
  p_request_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing uuid;
  v_booking uuid;
begin
  if p_request_key is null or length(trim(p_request_key)) < 8 or length(trim(p_request_key)) > 128 then
    raise exception 'A valid idempotency request key is required';
  end if;

  if (select auth.uid()) is null or (select auth.uid()) <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || ':' || trim(p_request_key), 0
  ));

  select booking_id into v_existing
  from public.booking_requests
  where user_id = p_user_id and request_key = trim(p_request_key);

  if v_existing is not null then
    return v_existing;
  end if;

  v_booking := public.book_service(
    p_user_id,
    p_guruba_id,
    p_service_id,
    p_scheduled_at,
    p_platform_fee,
    p_location_lat,
    p_location_lng,
    p_location_address,
    p_proposed_time,
    p_booking_note,
    p_is_custom_booking,
    p_is_online
  );

  insert into public.booking_requests(user_id, request_key, booking_id)
  values (p_user_id, trim(p_request_key), v_booking);

  return v_booking;
end;
$function$;

revoke execute on function public.book_service_idempotent(
  uuid,uuid,uuid,timestamptz,integer,double precision,double precision,text,timestamptz,text,boolean,boolean,text
) from public, anon;
grant execute on function public.book_service_idempotent(
  uuid,uuid,uuid,timestamptz,integer,double precision,double precision,text,timestamptz,text,boolean,boolean,text
) to authenticated;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_new_scheduled_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.bookings%rowtype;
  v_role text;
  v_duration integer;
  v_local timestamp;
begin
  if p_new_scheduled_at is null or p_new_scheduled_at <= now() then
    raise exception 'A future scheduled time is required';
  end if;

  select role into v_role
  from public.profiles
  where id = (select auth.uid());

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'Booking not found'; end if;

  if v_role = 'admin' then
    null;
  elsif v_booking.user_id = (select auth.uid()) then
    null;
  elsif exists (
    select 1 from public.gurubas g
    where g.id = v_booking.guruba_id and g.user_id = (select auth.uid())
  ) then
    null;
  else
    raise exception 'Access denied';
  end if;

  if v_booking.status not in ('pending','confirmed') then
    raise exception 'Only pending or confirmed bookings can be rescheduled';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = v_booking.service_id;

  if v_duration is null or v_duration <= 0 then
    raise exception 'Booking service has no fixed duration';
  end if;

  v_local := p_new_scheduled_at at time zone 'Asia/Kathmandu';

  if extract(minute from v_local)::integer not in (0,30)
     or extract(second from v_local) <> 0 then
    raise exception 'Booking time must be on a 30-minute boundary';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'booking-slot:' || v_booking.guruba_id::text || ':' ||
    (v_local::date)::text, 0
  ));

  if not exists (
    select 1
    from public.guruba_availability a
    where a.guruba_id = v_booking.guruba_id
      and a.day_of_week = extract(dow from v_local)::integer
      and v_local::time >= a.start_time
      and (v_local::time + make_interval(mins => v_duration)) <= a.end_time
  ) then
    raise exception 'Selected time is outside the Guruba availability';
  end if;

  if exists (
    select 1
    from public.bookings b
    join public.services bs on bs.id = b.service_id
    where b.id <> p_booking_id
      and b.guruba_id = v_booking.guruba_id
      and b.status in ('pending','confirmed','awaiting_client_confirmation')
      and b.scheduled_at is not null
      and v_local < (b.scheduled_at at time zone 'Asia/Kathmandu')
        + make_interval(mins => greatest(coalesce(bs.duration_minutes,60),30) + 30)
      and v_local + make_interval(mins => v_duration)
        > (b.scheduled_at at time zone 'Asia/Kathmandu')
  ) then
    raise exception 'That time is no longer available';
  end if;

  update public.bookings
  set scheduled_at = p_new_scheduled_at,
      proposed_time = null,
      confirmation_deadline = null
  where id = p_booking_id;
end;
$function$;

revoke execute on function public.reschedule_booking(uuid,timestamptz) from public, anon;
grant execute on function public.reschedule_booking(uuid,timestamptz) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.bookings%rowtype;
  v_role text;
  v_ref text;
begin
  select role into v_role
  from public.profiles
  where id = (select auth.uid());

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'Booking not found'; end if;

  if v_role = 'admin' then
    null;
  elsif v_booking.user_id = (select auth.uid()) then
    null;
  elsif exists (
    select 1 from public.gurubas g
    where g.id = v_booking.guruba_id and g.user_id = (select auth.uid())
  ) then
    null;
  else
    raise exception 'Access denied';
  end if;

  if v_booking.status not in ('pending','confirmed','awaiting_client_confirmation') then
    raise exception 'Booking cannot be cancelled from its current state';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  if coalesce(v_booking.platform_fee,0) > 0 then
    v_ref := 'booking-refund:' || p_booking_id::text;

    if not exists (
      select 1 from public.transactions
      where reference_key = v_ref
    ) then
      update public.profiles
      set credits = credits + v_booking.platform_fee
      where id = v_booking.user_id;

      insert into public.transactions(
        user_id, amount, type, description, status, reference_key
      )
      values (
        v_booking.user_id,
        v_booking.platform_fee,
        'credit',
        'Booking fee refund',
        'completed',
        v_ref
      );
    end if;
  end if;
end;
$function$;

revoke execute on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

commit;
