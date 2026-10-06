-- Admin concierge booking API.
-- Server-owned booking creation with authorization, availability and conflict checks.

create or replace function public.admin_create_booking(
  p_user_id uuid,
  p_guruba_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking_id uuid;
  v_service_duration integer;
  v_local_scheduled timestamp;
begin
  if (select coalesce((select role from public.profiles where id = (select auth.uid())), 'client')) <> 'admin' then
    raise exception 'Unauthorized';
  end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'The scheduled time must be in the future';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'Client profile not found'; end if;
  if not exists (select 1 from public.gurubas where id = p_guruba_id) then raise exception 'Guruba not found'; end if;
  if not exists (select 1 from public.guruba_services where guruba_id = p_guruba_id and service_id = p_service_id) then raise exception 'This Guruba does not offer the selected service'; end if;
  select duration_minutes into v_service_duration from public.services where id = p_service_id;
  if v_service_duration is null or v_service_duration <= 0 then raise exception 'This service requires custom scheduling'; end if;
  v_local_scheduled := p_scheduled_at at time zone 'Asia/Kathmandu';
  if extract(minute from v_local_scheduled)::integer not in (0, 30) or extract(second from v_local_scheduled) <> 0 then raise exception 'Please choose a 30-minute booking slot'; end if;
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
      and v_local_scheduled < (b.scheduled_at at time zone 'Asia/Kathmandu') + make_interval(mins => greatest(coalesce(bs.duration_minutes,60),30) + 30)
      and v_local_scheduled + make_interval(mins => v_service_duration) > (b.scheduled_at at time zone 'Asia/Kathmandu')
  ) then raise exception 'That time has just been booked. Please choose another slot'; end if;
  insert into public.bookings (user_id, guruba_id, service_id, scheduled_at, status, platform_fee)
  values (p_user_id, p_guruba_id, p_service_id, p_scheduled_at, 'confirmed', 0)
  returning id into v_booking_id;
  return v_booking_id;
end;
$function$;

revoke execute on function public.admin_create_booking(uuid,uuid,uuid,timestamptz) from public, anon;
grant execute on function public.admin_create_booking(uuid,uuid,uuid,timestamptz) to authenticated;
