-- B9 static database contract assertions for the current backend architecture.
do $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='book_service_idempotent'
  ) into v_exists;
  if not v_exists then raise exception 'missing booking idempotency RPC'; end if;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='reschedule_booking'
  ) into v_exists;
  if not v_exists then raise exception 'missing reschedule RPC'; end if;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='claim_job_queue'
  ) into v_exists;
  if not v_exists then raise exception 'missing durable job queue claim RPC'; end if;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='complete_job_queue'
  ) into v_exists;
  if not v_exists then raise exception 'missing durable job queue completion RPC'; end if;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='fail_job_queue'
  ) into v_exists;
  if not v_exists then raise exception 'missing durable job queue failure RPC'; end if;

  if has_table_privilege('authenticated','public.bookings','INSERT') then
    raise exception 'authenticated must not directly insert bookings';
  end if;

  if has_table_privilege('authenticated','public.bookings','UPDATE') then
    raise exception 'authenticated must not directly update bookings';
  end if;

  if has_table_privilege('authenticated','public.transactions','INSERT') then
    raise exception 'authenticated must not directly insert transactions';
  end if;

  if has_table_privilege('authenticated','public.domain_events','SELECT') then
    raise exception 'authenticated must not read domain_events';
  end if;

  if has_function_privilege('authenticated','public.claim_job_queue(text,integer)','EXECUTE') then
    raise exception 'authenticated must not execute claim_job_queue';
  end if;

  if has_function_privilege('authenticated','public.complete_job_queue(uuid,text)','EXECUTE') then
    raise exception 'authenticated must not execute complete_job_queue';
  end if;

  if has_function_privilege('authenticated','public.fail_job_queue(uuid,text,text,integer)','EXECUTE') then
    raise exception 'authenticated must not execute fail_job_queue';
  end if;

  raise notice 'B9 security invariants passed';
end $$;
