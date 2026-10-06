-- Prevent privilege/credit escalation through profile updates and signup metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_requested_role text;
  v_role text;
begin
  v_requested_role := new.raw_user_meta_data->>'role';
  v_role := case when v_requested_role = 'guruba' then 'guruba' else 'client' end;

  insert into public.profiles (id, email, full_name, role, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    v_role,
    100
  )
  on conflict (id) do nothing;

  if v_role = 'guruba' then
    insert into public.gurubas (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is not null
     and auth.uid() = old.id
     and not public.is_admin(auth.uid()) then
    new.role := old.role;
    new.credits := old.credits;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
before update on public.profiles
for each row
execute function public.protect_profile_fields();

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
