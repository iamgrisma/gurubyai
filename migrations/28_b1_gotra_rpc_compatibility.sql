-- B1 compatibility fix: RPC inputs remain text for existing clients,
-- but the normalized profiles.gotra_id column is UUID.
begin;
create or replace function public.update_my_profile(
  p_full_name text default null, p_phone text default null, p_gotra_id text default null,
  p_avatar_url text default null, p_city text default null, p_latitude double precision default null,
  p_longitude double precision default null, p_address text default null, p_languages text[] default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_gotra uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_gotra_id is not null and trim(p_gotra_id)<>'' then
    begin v_gotra := trim(p_gotra_id)::uuid; exception when invalid_text_representation then raise exception 'Invalid Gotra'; end;
  end if;
  update public.profiles set full_name=coalesce(trim(p_full_name),full_name),phone=coalesce(trim(p_phone),phone),
    gotra_id=v_gotra,avatar_url=p_avatar_url,city=p_city,latitude=p_latitude,longitude=p_longitude,
    address=p_address,languages=p_languages where id=v_uid;
  if not found then raise exception 'Profile not found'; end if;
end; $$;
create or replace function public.upsert_my_guruba_profile(
  p_bio text,p_guruba_type text,p_location text,p_gotra_id text default null,
  p_latitude double precision default null,p_longitude double precision default null,p_address text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid; v_gotra uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from public.profiles where id=v_uid and role='guruba') then raise exception 'Only Gurubas can manage a Guruba profile'; end if;
  if p_gotra_id is not null and trim(p_gotra_id)<>'' then
    begin v_gotra := trim(p_gotra_id)::uuid; exception when invalid_text_representation then raise exception 'Invalid Gotra'; end;
  end if;
  if p_guruba_type not in ('brahmin','non_brahmin','astrologer') then raise exception 'Invalid Guruba type'; end if;
  insert into public.gurubas(user_id,bio,guruba_type,location) values(v_uid,p_bio,p_guruba_type,p_location)
  on conflict(user_id) do update set bio=excluded.bio,guruba_type=excluded.guruba_type,location=excluded.location returning id into v_id;
  update public.profiles set gotra_id=v_gotra,latitude=p_latitude,longitude=p_longitude,address=p_address where id=v_uid;
  return v_id;
end; $$;
commit;