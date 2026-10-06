-- B7: recover durable queue jobs abandoned by crashed workers.
create or replace function public.recover_stale_job_queue(p_stale_after_seconds integer default 300)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_recovered integer;
  v_failed integer;
begin
  if p_stale_after_seconds is null or p_stale_after_seconds < 30 then
    raise exception 'Invalid stale timeout';
  end if;

  update public.job_queue
     set status = 'pending',
         available_at = now(),
         locked_at = null,
         locked_by = null,
         last_error = left(coalesce(last_error,'') || case when coalesce(last_error,'')='' then '' else E'\\n' end || 'Recovered stale worker lock', 4000)
   where status = 'processing'
     and locked_at is not null
     and locked_at < now() - make_interval(secs => p_stale_after_seconds)
     and attempts < max_attempts;
  get diagnostics v_recovered = row_count;

  update public.job_queue
     set status = 'failed',
         completed_at = coalesce(completed_at, now()),
         locked_at = null,
         locked_by = null,
         last_error = left(coalesce(last_error,'') || case when coalesce(last_error,'')='' then '' else E'\\n' end || 'Exceeded max attempts after stale worker lock', 4000)
   where status = 'processing'
     and locked_at is not null
     and locked_at < now() - make_interval(secs => p_stale_after_seconds)
     and attempts >= max_attempts;
  get diagnostics v_failed = row_count;

  v_count := coalesce(v_recovered,0) + coalesce(v_failed,0);
  return v_count;
end;
$$;

revoke all on function public.recover_stale_job_queue(integer) from public, anon, authenticated;
