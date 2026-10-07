-- B11 native push notification registration contract assertions.
do $$
begin
  if to_regclass('public.notification_devices') is null then raise exception 'notification_devices table is missing'; end if;
  if not (select relrowsecurity from pg_class where oid='public.notification_devices'::regclass) then raise exception 'notification_devices RLS is disabled'; end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notification_devices' and policyname='notification_devices_select_own') then raise exception 'notification_devices ownership SELECT policy is missing'; end if;
  if has_function_privilege('anon','public.register_my_notification_device(text,text,text,text)','execute') then raise exception 'anon can execute register_my_notification_device'; end if;
  if not has_function_privilege('authenticated','public.register_my_notification_device(text,text,text,text)','execute') then raise exception 'authenticated cannot execute register_my_notification_device'; end if;
  if has_function_privilege('anon','public.get_my_notification_devices()','execute') then raise exception 'anon can execute get_my_notification_devices'; end if;
  if not has_function_privilege('authenticated','public.get_my_notification_devices()','execute') then raise exception 'authenticated cannot execute get_my_notification_devices'; end if;
  if has_function_privilege('anon','public.remove_my_notification_device(uuid)','execute') then raise exception 'anon can execute remove_my_notification_device'; end if;
  if not has_function_privilege('authenticated','public.remove_my_notification_device(uuid)','execute') then raise exception 'authenticated cannot execute remove_my_notification_device'; end if;
  raise notice 'B11 notification device contract passed';
end
$$;