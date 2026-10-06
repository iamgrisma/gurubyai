-- B5: serialize top-up request creation per user.
-- Prevents concurrent requests from bypassing the recent-pending guard.

begin;

create or replace function public.request_topup(p_amount integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then
    raise exception 'Invalid top-up amount';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  if exists (
    select 1
    from public.topup_requests
    where user_id = v_uid
      and status = 'pending'
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'A recent top-up request is already pending';
  end if;

  insert into public.topup_requests(user_id, amount, status)
  values(v_uid, p_amount, 'pending')
  returning id into v_id;

  return v_id;
end;
$function$;

revoke execute on function public.request_topup(integer) from public, anon;
grant execute on function public.request_topup(integer) to authenticated;

commit;
