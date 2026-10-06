do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_queue' and column_name='available_at') then raise exception 'B7 queue available_at missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_queue' and column_name='attempts') then raise exception 'B7 queue attempts missing'; end if;
  if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='claim_job_queue') then raise exception 'B7 claim RPC missing'; end if;
  if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='complete_job_queue') then raise exception 'B7 complete RPC missing'; end if;
  if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='fail_job_queue') then raise exception 'B7 fail RPC missing'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='uq_job_queue_idempotency_key') then raise exception 'B7 idempotency index missing'; end if;
  raise notice 'B7 durable queue invariants passed';
end $$;
