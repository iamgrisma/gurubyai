-- B9: validate admin wallet credits before mutating the ledger.
create or replace function public.admin_add_credits(target_user_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Access denied'; end if;
  if target_user_id is null or amount is null or amount <= 0 or amount > 10000000 then raise exception 'Invalid credit amount'; end if;
  if not exists (select 1 from public.profiles where id=target_user_id) then raise exception 'User profile not found'; end if;
  update public.profiles set credits=coalesce(credits,0)+amount where id=target_user_id;
  insert into public.transactions(user_id,amount,type,description,status) values(target_user_id,amount,'credit','Admin Top-up','completed');
end;
$$;
revoke execute on function public.admin_add_credits(uuid,numeric) from public, anon;
grant execute on function public.admin_add_credits(uuid,numeric) to authenticated;
