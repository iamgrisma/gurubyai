-- B11 durable push delivery contract assertions.
do $$
begin
  if to_regclass('public.notification_push_deliveries') is null then
    raise exception 'notification_push_deliveries table is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.notification_push_deliveries'::regclass) then
    raise exception 'notification_push_deliveries RLS is disabled';
  end if;
  if has_table_privilege('anon','public.notification_push_deliveries','select') then
    raise exception 'anon can directly select notification_push_deliveries';
  end if;
  if has_table_privilege('authenticated','public.notification_push_deliveries','select') then
    raise exception 'authenticated can directly select notification_push_deliveries';
  end if;
  if to_regprocedure('public.queue_notification_push()') is null then
    raise exception 'queue_notification_push function is missing';
  end if;
  if has_function_privilege('anon','public.queue_notification_push()','execute') then
    raise exception 'anon can execute queue_notification_push';
  end if;
  if has_function_privilege('authenticated','public.queue_notification_push()','execute') then
    raise exception 'authenticated can execute queue_notification_push';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.notifications'::regclass
      and tgname='trg_queue_notification_push'
      and tgenabled <> 'D'
  ) then
    raise exception 'notification push trigger is missing or disabled';
  end if;
  raise notice 'B11 push delivery contract passed';
end
$$;
