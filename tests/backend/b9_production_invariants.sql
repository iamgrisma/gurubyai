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