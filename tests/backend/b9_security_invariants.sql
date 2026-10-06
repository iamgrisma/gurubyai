-- B9 static database contract assertions.
do $$
declare
  v_exists boolean;
begin
  select exists(select 1 from pg_proc where proname = 'book_service_idempotent') into v_exists;
  if not v_exists then raise exception 'missing booking idempotency RPC'; end if;

  select exists(select 1 from pg_proc where proname = 'reschedule_booking') into v_exists;
  if not v_exists then raise exception 'missing reschedule RPC'; end if;

  select exists(select 1 from pg_proc where proname = 'claim_domain_events') into v_exists;
  if not v_exists then raise exception 'missing outbox claim RPC'; end if;

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

  raise notice 'B9 security invariants passed';
end $$;
