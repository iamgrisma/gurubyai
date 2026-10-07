-- B11: native push notification device registration contract.
begin;

create table if not exists public.notification_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios','android')),
  device_id text,
  expo_project_id text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_devices_token_length check (char_length(trim(expo_push_token)) between 10 and 512),
  constraint notification_devices_device_id_length check (device_id is null or char_length(device_id) <= 256),
  constraint notification_devices_project_id_length check (expo_project_id is null or char_length(expo_project_id) <= 128)
);

create unique index if not exists idx_notification_devices_token on public.notification_devices(expo_push_token);
create index if not exists idx_notification_devices_user_active on public.notification_devices(user_id, is_active, last_seen_at desc);

alter table public.notification_devices enable row level security;
revoke all on table public.notification_devices from anon, authenticated;

drop policy if exists "notification_devices_select_own" on public.notification_devices;
drop policy if exists "notification_devices_insert_own" on public.notification_devices;
drop policy if exists "notification_devices_update_own" on public.notification_devices;
drop policy if exists "notification_devices_delete_own" on public.notification_devices;

create policy "notification_devices_select_own" on public.notification_devices for select to authenticated using (user_id = (select auth.uid()));
create policy "notification_devices_insert_own" on public.notification_devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notification_devices_update_own" on public.notification_devices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notification_devices_delete_own" on public.notification_devices for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.register_my_notification_device(p_token text,p_platform text,p_device_id text default null,p_expo_project_id text default null)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_platform text := lower(trim(p_platform));
  v_token text := trim(p_token);
  v_device_id text := nullif(trim(p_device_id), '');
  v_project_id text := nullif(trim(p_expo_project_id), '');
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if v_platform not in ('ios','android') then raise exception 'invalid_platform'; end if;
  if char_length(v_token) < 10 or char_length(v_token) > 512 then raise exception 'invalid_push_token'; end if;
  if v_device_id is not null and char_length(v_device_id) > 256 then raise exception 'invalid_device_id'; end if;
  if v_project_id is not null and char_length(v_project_id) > 128 then raise exception 'invalid_expo_project_id'; end if;

  insert into public.notification_devices(user_id,expo_push_token,platform,device_id,expo_project_id,is_active,last_seen_at,updated_at)
  values(v_user_id,v_token,v_platform,v_device_id,v_project_id,true,now(),now())
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id, platform = excluded.platform, device_id = excluded.device_id,
      expo_project_id = excluded.expo_project_id, is_active = true, last_seen_at = now(), updated_at = now()
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_my_notification_device(text,text,text,text) from public;
revoke all on function public.register_my_notification_device(text,text,text,text) from anon;
grant execute on function public.register_my_notification_device(text,text,text,text) to authenticated;

create or replace function public.get_my_notification_devices()
returns table(id uuid,platform text,device_id text,expo_project_id text,is_active boolean,last_seen_at timestamptz,created_at timestamptz)
language sql security definer set search_path = ''
as $function$
  select d.id,d.platform,d.device_id,d.expo_project_id,d.is_active,d.last_seen_at,d.created_at
  from public.notification_devices d
  where d.user_id = (select auth.uid())
  order by d.last_seen_at desc;
$function$;

revoke all on function public.get_my_notification_devices() from public;
revoke all on function public.get_my_notification_devices() from anon;
grant execute on function public.get_my_notification_devices() to authenticated;

create or replace function public.remove_my_notification_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.notification_devices set is_active = false, updated_at = now()
  where id = p_device_id and user_id = (select auth.uid()) and is_active = true;
  return found;
end;
$function$;

revoke all on function public.remove_my_notification_device(uuid) from public;
revoke all on function public.remove_my_notification_device(uuid) from anon;
grant execute on function public.remove_my_notification_device(uuid) to authenticated;

commit;