-- B10/B11 booking event projection contract assertions.
do $$
begin
  if to_regclass('public.booking_events') is null then raise exception 'booking_events table is missing'; end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='get_my_booking_events'
      and pg_get_function_identity_arguments(p.oid)='p_booking_id uuid'
  ) then raise exception 'get_my_booking_events(uuid) is missing'; end if;
  if not has_function_privilege('authenticated','public.get_my_booking_events(uuid)','execute') then raise exception 'authenticated cannot execute get_my_booking_events'; end if;
  if has_function_privilege('anon','public.get_my_booking_events(uuid)','execute') then raise exception 'anon can execute get_my_booking_events'; end if;
  if not exists (
    select 1 from pg_attribute a
    join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='booking_events' and a.attname in ('id','booking_id','event_type','payload','created_at')
    group by c.oid
    having count(*)=5
  ) then raise exception 'booking_events projection columns are incomplete'; end if;
  raise notice 'B10/B11 booking event projection contract passed';
end
$$;
