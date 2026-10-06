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
