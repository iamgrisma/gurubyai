-- B9 production invariant assertions
do $$ begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='gotra_id') <> 'uuid' then raise exception 'B1 gotra_id is not uuid'; end if;
  if (select data_type from information_schema.columns where table_schema='public' and table_name='gurubas' and column_name='review_count') <> 'integer' then raise exception 'B1 review_count is not integer'; end if;
  if not exists(select 1 from pg_constraint where conname='transactions_amount_positive') then raise exception 'B5 amount constraint missing'; end if;
  if not exists(select 1 from pg_constraint where conname='profiles_credits_nonnegative') then raise exception 'B5 credit constraint missing'; end if;
  if not exists(select 1 from pg_class where relname='booking_events') then raise exception 'B7 booking_events missing'; end if;
  if not exists(select 1 from pg_class where relname='domain_events') then raise exception 'B7 domain_events missing'; end if;
  raise notice 'B9 production invariant assertions passed';
end $$;

-- B9 authorization and queue hardening assertions
do $$
declare v_client uuid;
begin
  select id into v_client from public.profiles where coalesce(role,'client') <> 'admin' limit 1;
  if v_client is null then raise exception 'No non-admin profile available for authorization test'; end if;
  if has_table_privilege('authenticated','public.bookings','INSERT') then raise exception 'authenticated still has direct INSERT on bookings'; end if;
  if has_table_privilege('authenticated','public.bookings','UPDATE') then raise exception 'authenticated still has direct UPDATE on bookings'; end if;
  if has_table_privilege('authenticated','public.transactions','INSERT') then raise exception 'authenticated still has direct INSERT on transactions'; end if;
  if has_table_privilege('authenticated','public.transactions','UPDATE') then raise exception 'authenticated still has direct UPDATE on transactions'; end if;
  if not has_function_privilege('authenticated','public.admin_add_credits(uuid,numeric)','EXECUTE') then raise exception 'admin_add_credits execute grant missing'; end if;
  if not has_function_privilege('authenticated','public.approve_topup_request(uuid)','EXECUTE') then raise exception 'approve_topup_request execute grant missing'; end if;
  if not has_function_privilege('authenticated','public.reject_topup_request(uuid)','EXECUTE') then raise exception 'reject_topup_request execute grant missing'; end if;
  if has_function_privilege('authenticated','public.claim_job_queue(text,integer)','EXECUTE') then raise exception 'claim_job_queue must not be client callable'; end if;
  if has_function_privilege('authenticated','public.complete_job_queue(uuid,text)','EXECUTE') then raise exception 'complete_job_queue must not be client callable'; end if;
  if has_function_privilege('authenticated','public.fail_job_queue(uuid,text,text,integer)','EXECUTE') then raise exception 'fail_job_queue must not be client callable'; end if;
  if has_function_privilege('authenticated','public.recover_stale_job_queue(integer)','EXECUTE') then raise exception 'recover_stale_job_queue must not be client callable'; end if;
  raise notice 'B9 authorization and queue hardening assertions passed';
end $$;


-- Profile exposure hardening: anonymous clients must not have direct SELECT.
do $$
declare v_count integer;
begin
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema='public'
    and table_name='profiles'
    and grantee='anon'
    and privilege_type='SELECT';
  if v_count <> 0 then
    raise exception 'anon profile SELECT grant still exists';
  end if;
  if to_regprocedure('public.get_public_gurubas()') is null then
    raise exception 'public Guruba projection RPC missing';
  end if;
  if to_regprocedure('public.get_my_profile()') is null then
    raise exception 'private profile projection RPC missing';
  end if;
end $$;

-- B3 private read projection assertions.
do $$ begin
  if to_regprocedure('public.get_my_bookings(text)') is null then raise exception 'get_my_bookings RPC missing'; end if;
  if to_regprocedure('public.get_my_message_users()') is null then raise exception 'get_my_message_users RPC missing'; end if;
  if to_regprocedure('public.get_my_messages(uuid,uuid)') is null then raise exception 'get_my_messages RPC missing'; end if;
end $$;

-- B3 admin read projection assertions.
do $$ begin
 if to_regprocedure('public.admin_get_users(text,integer,integer)') is null then raise exception 'admin_get_users missing'; end if;
 if to_regprocedure('public.admin_get_overview()') is null then raise exception 'admin_get_overview missing'; end if;
 if to_regprocedure('public.admin_search_clients(text)') is null then raise exception 'admin_search_clients missing'; end if;
 if to_regprocedure('public.admin_get_gurubas_for_concierge()') is null then raise exception 'admin_get_gurubas_for_concierge missing'; end if;
 if to_regprocedure('public.admin_get_transactions(integer,integer)') is null then raise exception 'admin_get_transactions missing'; end if;
 if to_regprocedure('public.admin_get_pending_topups(integer,integer)') is null then raise exception 'admin_get_pending_topups missing'; end if;
 if to_regprocedure('public.admin_get_pending_verifications()') is null then raise exception 'admin_get_pending_verifications missing'; end if;
end $$;

-- B3 read projection surface checks
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_proc
  WHERE pronamespace='public'::regnamespace
    AND proname IN (
      'get_my_profile','get_public_gurubas','get_my_transactions',
      'get_my_saved_locations','get_my_bookings','get_my_message_users',
      'get_my_message_user','get_my_messages','get_my_guruba_profile',
      'admin_get_users','admin_get_overview','admin_search_clients',
      'admin_get_gurubas_for_concierge','admin_get_transactions',
      'admin_get_pending_topups','admin_get_pending_verifications'
    );
  IF n < 17 THEN RAISE EXCEPTION 'B3 projection functions missing: %', n; END IF;
END $$;

DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad
  FROM pg_proc
  WHERE pronamespace='public'::regnamespace
    AND proname IN (
      'get_my_profile','get_public_gurubas','get_my_transactions',
      'get_my_saved_locations','get_my_bookings','get_my_message_users',
      'get_my_message_user','get_my_messages','get_my_guruba_profile',
      'admin_get_users','admin_get_overview','admin_search_clients',
      'admin_get_gurubas_for_concierge','admin_get_transactions',
      'admin_get_pending_topups','admin_get_pending_verifications'
    )
    AND has_function_privilege('anon', oid, 'EXECUTE');
  IF bad <> 0 THEN RAISE EXCEPTION 'B3 projection functions exposed to anon: %', bad; END IF;
END $$;
