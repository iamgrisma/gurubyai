-- B10: authenticated booking event projection for client/provider timelines.
-- booking_events is intentionally not exposed directly; this RPC returns only the
-- timeline fields needed by the application after verifying booking ownership.

begin;

create or replace function public.get_my_booking_events(p_booking_id uuid)
returns table(
  id uuid,
  event_type text,
  scheduled_at timestamptz,
  status text,
  previous_status text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select
    e.id,
    e.event_type,
    nullif(e.payload->>'scheduled_at','')::timestamptz,
    nullif(e.payload->>'status',''),
    nullif(e.payload->>'previous_status',''),
    e.created_at
  from public.booking_events e
  join public.bookings b on b.id = e.booking_id
  left join public.gurubas g on g.id = b.guruba_id
  where e.booking_id = p_booking_id
    and (select auth.uid()) is not null
    and (
      b.user_id = (select auth.uid())
      or g.user_id = (select auth.uid())
    )
  order by e.created_at asc;
$function$;

revoke all on function public.get_my_booking_events(uuid) from public;
revoke all on function public.get_my_booking_events(uuid) from anon;
grant execute on function public.get_my_booking_events(uuid) to authenticated;

commit;
