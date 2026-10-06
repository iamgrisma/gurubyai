-- B7 worker primitives: lease pending events and complete them safely.
begin;

alter table public.domain_events
  add column if not exists attempts integer not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists last_error text;

create index if not exists idx_domain_events_claimable
  on public.domain_events(created_at)
  where processed_at is null;

create or replace function public.claim_domain_events(
  p_worker_id text,
  p_limit integer default 25
)
returns setof public.domain_events
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 3 then
    raise exception 'invalid worker id';
  end if;

  return query
  with picked as (
    select id
    from public.domain_events
    where processed_at is null
      and (locked_at is null or locked_at < now() - interval '5 minutes')
    order by created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.domain_events e
  set locked_at = now(),
      locked_by = p_worker_id,
      attempts = e.attempts + 1
  from picked
  where e.id = picked.id
  returning e.*;
end;
$$;

create or replace function public.complete_domain_event(
  p_event_id uuid,
  p_worker_id text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.domain_events
  set processed_at = case when p_error is null then now() else null end,
      last_error = p_error,
      locked_at = null,
      locked_by = null
  where id = p_event_id
    and locked_by = p_worker_id;

  return found;
end;
$$;

revoke all on function public.claim_domain_events(text, integer) from public, anon, authenticated;
revoke all on function public.complete_domain_event(uuid, text, text) from public, anon, authenticated;

commit;
