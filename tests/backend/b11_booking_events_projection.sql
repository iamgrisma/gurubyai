-- B10 booking event projection contract assertions.
do $$
declare
  fn oid;
  cfg text[];
  result_signature text;
begin
  fn := to_regprocedure('public.get_my_booking_events(uuid)');
  if fn is null then raise exception 'get_my_booking_events(uuid) is missing'; end if;

  select p.proconfig, pg_get_function_result(p.oid)
    into cfg, result_signature
  from pg_proc p
  where p.oid = fn;

  if not (select p.prosecdef from pg_proc p where p.oid = fn) then
    raise exception 'get_my_booking_events must use security definer because booking_events is private';
  end if;
  if not exists (select 1 from unnest(coalesce(cfg, '{}'::text[])) v where v = 'search_path=""') then
    raise exception 'get_my_booking_events must pin an empty search_path';
  end if;
  if position('TABLE(id uuid, event_type text, scheduled_at timestamp with time zone, status text, previous_status text, created_at timestamp with time zone)' in result_signature) = 0 then
    raise exception 'get_my_booking_events return contract changed: %', result_signature;
  end if;

  if has_function_privilege('anon','public.get_my_booking_events(uuid)','execute') then
    raise exception 'anon can execute get_my_booking_events';
  end if;
  if not has_function_privilege('authenticated','public.get_my_booking_events(uuid)','execute') then
    raise exception 'authenticated cannot execute get_my_booking_events';
  end if;
  if has_table_privilege('anon','public.booking_events','select') then
    raise exception 'anon can directly select booking_events';
  end if;
  if has_table_privilege('authenticated','public.booking_events','select') then
    raise exception 'authenticated can directly select booking_events';
  end if;

  raise notice 'B10 booking event projection contract passed';
end
$$;
