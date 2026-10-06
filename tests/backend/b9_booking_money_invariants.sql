-- B9 static invariants for booking and money domains.
do $$
declare v_count integer;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.transactions'::regclass
      and conname='transactions_amount_positive'
  ) then raise exception 'missing positive transaction amount constraint'; end if;

  if not exists (
    select 1 from pg_index i
    join pg_class c on c.oid=i.indexrelid
    where c.relname='uq_transactions_reference_key' and i.indisunique
  ) then raise exception 'missing transaction reference-key uniqueness'; end if;

  select count(*) into v_count
  from pg_constraint
  where conrelid='public.profiles'::regclass
    and conname='profiles_credits_nonnegative';

  if v_count = 0 then raise exception 'missing nonnegative credits constraint'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.booking_requests'::regclass
      and conname like '%user_id%request_key%'
  ) then raise exception 'missing booking request idempotency uniqueness'; end if;

  raise notice 'B9 booking/money invariants passed';
end $$;
