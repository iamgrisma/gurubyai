-- B5: make the wallet ledger stricter and financial operations idempotent.

begin;

alter table public.transactions
  drop constraint if exists transactions_amount_positive;
alter table public.transactions
  add constraint transactions_amount_positive
  check (amount > 0);

alter table public.transactions
  drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('credit','debit'));

alter table public.transactions
  drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check
  check (status in ('pending','completed','failed'));

alter table public.profiles
  drop constraint if exists profiles_credits_nonnegative;
alter table public.profiles
  add constraint profiles_credits_nonnegative
  check (coalesce(credits,0) >= 0);

create or replace function public.approve_topup_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r_request public.topup_requests%rowtype;
  v_ref text;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Access denied: only administrators can approve top-up requests';
  end if;

  select * into r_request
  from public.topup_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Top-up request not found'; end if;
  if r_request.status <> 'pending' then
    raise exception 'Top-up request has already been processed';
  end if;
  if r_request.amount <= 0 then
    raise exception 'Invalid top-up amount';
  end if;

  v_ref := 'topup:' || p_request_id::text;

  update public.topup_requests
  set status = 'approved'
  where id = p_request_id;

  update public.profiles
  set credits = coalesce(credits,0) + r_request.amount
  where id = r_request.user_id;

  insert into public.transactions(
    user_id, amount, type, description, status, reference_key
  )
  values(
    r_request.user_id,
    r_request.amount,
    'credit',
    'Wallet top-up approval',
    'completed',
    v_ref
  )
  on conflict (reference_key) do nothing;
end;
$function$;

create or replace function public.reject_topup_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Access denied: only administrators can reject top-up requests';
  end if;

  update public.topup_requests
  set status = 'rejected'
  where id = p_request_id
    and status = 'pending';

  if not found then
    raise exception 'Top-up request not found or already processed';
  end if;
end;
$function$;

revoke execute on function public.approve_topup_request(uuid) from public, anon;
revoke execute on function public.reject_topup_request(uuid) from public, anon;
grant execute on function public.approve_topup_request(uuid) to authenticated;
grant execute on function public.reject_topup_request(uuid) to authenticated;

-- Financial tables are immutable from client roles.
revoke insert, update, delete on public.transactions from anon, authenticated;

commit;
