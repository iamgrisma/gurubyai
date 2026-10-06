-- B9 backend contract assertions.
-- Run against the target database with a privileged connection:
-- psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f tests/backend/b9_contract_assertions.sql

do $$
declare
  v_count integer;
begin
  -- B1 schema invariants.
  select count(*) into v_count
  from information_schema.columns
  where table_schema='public' and table_name='profiles'
    and column_name='gotra_id' and data_type='uuid';
  if v_count <> 1 then raise exception 'B1 failed: profiles.gotra_id is not uuid'; end if;

  select count(*) into v_count
  from information_schema.columns
  where table_schema='public' and table_name='gurubas'
    and column_name='review_count' and data_type='integer';
  if v_count <> 1 then raise exception 'B1 failed: gurubas.review_count is not integer'; end if;

  -- Direct client booking mutations must remain revoked.
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema='public' and table_name='bookings'
    and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE');
  if v_count <> 0 then raise exception 'B2 failed: authenticated can mutate bookings directly'; end if;

  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema='public' and table_name='transactions'
    and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE');
  if v_count <> 0 then raise exception 'B5 failed: authenticated can mutate transactions directly'; end if;

  -- Required domain functions must be callable by authenticated clients.
  foreach v_count in array array[
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='book_service_idempotent'),
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='reschedule_booking')
  ] loop
    if v_count <> 1 then raise exception 'Required B4 RPC missing'; end if;
  end loop;

  -- Internal event tables must not be directly exposed.
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema='public' and table_name in ('booking_events','domain_events')
    and grantee='authenticated'
    and privilege_type in ('SELECT','INSERT','UPDATE','DELETE');
  if v_count <> 0 then raise exception 'B7 failed: internal event table exposed'; end if;

  raise notice 'GurubyAI B9 contract assertions passed';
end $$;
