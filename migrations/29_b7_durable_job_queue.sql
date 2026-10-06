-- B7 durable job queue: leased claims, bounded retries, idempotency.
alter table public.job_queue add column if not exists available_at timestamptz not null default now();
alter table public.job_queue add column if not exists attempts integer not null default 0;
alter table public.job_queue add column if not exists max_attempts integer not null default 8;
alter table public.job_queue add column if not exists locked_at timestamptz;
alter table public.job_queue add column if not exists locked_by text;
alter table public.job_queue add column if not exists last_error text;
alter table public.job_queue add column if not exists completed_at timestamptz;
alter table public.job_queue add column if not exists idempotency_key text;
create unique index if not exists uq_job_queue_idempotency_key on public.job_queue(idempotency_key) where idempotency_key is not null;
create index if not exists idx_job_queue_claim on public.job_queue(status,available_at,created_at) where status='pending';
create or replace function public.claim_job_queue(p_worker_id text,p_limit integer default 10) returns setof public.job_queue language plpgsql security definer set search_path=public,pg_temp as $$ begin if p_worker_id is null or length(trim(p_worker_id))=0 then raise exception 'Invalid worker id'; end if; return query with picked as (select id from public.job_queue where status='pending' and available_at<=now() and attempts<max_attempts order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,10),100))) update public.job_queue j set status='processing',attempts=j.attempts+1,locked_at=now(),locked_by=trim(p_worker_id) from picked where j.id=picked.id returning j.*; end; $$;
create or replace function public.complete_job_queue(p_job_id uuid,p_worker_id text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$ begin update public.job_queue set status='completed',completed_at=now(),locked_at=null,locked_by=null where id=p_job_id and status='processing' and locked_by=trim(p_worker_id); return found; end; $$;
create or replace function public.fail_job_queue(p_job_id uuid,p_worker_id text,p_error text,p_retry_delay_seconds integer default 60) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$ begin update public.job_queue set status=case when attempts>=max_attempts then 'failed' else 'pending' end,available_at=case when attempts>=max_attempts then available_at else now()+make_interval(secs=>greatest(1,least(coalesce(p_retry_delay_seconds,60),86400))) end,last_error=left(coalesce(p_error,''),4000),locked_at=null,locked_by=null where id=p_job_id and status='processing' and locked_by=trim(p_worker_id); return found; end; $$;
revoke all on function public.claim_job_queue(text,integer) from public,anon,authenticated;
revoke all on function public.complete_job_queue(uuid,text) from public,anon,authenticated;
revoke all on function public.fail_job_queue(uuid,text,text,integer) from public,anon,authenticated;
