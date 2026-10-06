-- Core domain API boundary (B3)
-- Applied to Supabase project axctxzjqnxbloxakhhmx.

create or replace function public.update_my_profile(
  p_full_name text default null, p_phone text default null, p_gotra_id text default null,
  p_avatar_url text default null, p_city text default null, p_latitude double precision default null,
  p_longitude double precision default null, p_address text default null, p_languages text[] default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_full_name is not null and length(trim(p_full_name))>120 then raise exception 'Full name is too long'; end if;
  if p_phone is not null and length(trim(p_phone))>40 then raise exception 'Phone is too long'; end if;
  if p_city is not null and length(trim(p_city))>120 then raise exception 'City is too long'; end if;
  if p_address is not null and length(trim(p_address))>500 then raise exception 'Address is too long'; end if;
  if p_latitude is not null and (p_latitude<-90 or p_latitude>90) then raise exception 'Invalid latitude'; end if;
  if p_longitude is not null and (p_longitude<-180 or p_longitude>180) then raise exception 'Invalid longitude'; end if;
  update public.profiles set full_name=coalesce(trim(p_full_name),full_name),phone=coalesce(trim(p_phone),phone),
    gotra_id=p_gotra_id,avatar_url=p_avatar_url,city=p_city,latitude=p_latitude,longitude=p_longitude,
    address=p_address,languages=p_languages where id=v_uid;
  if not found then raise exception 'Profile not found'; end if;
end; $$;

create or replace function public.upsert_my_guruba_profile(
  p_bio text,p_guruba_type text,p_location text,p_gotra_id text default null,
  p_latitude double precision default null,p_longitude double precision default null,p_address text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from public.profiles where id=v_uid and role='guruba') then raise exception 'Only Gurubas can manage a Guruba profile'; end if;
  if p_guruba_type not in ('brahmin','non_brahmin','astrologer') then raise exception 'Invalid Guruba type'; end if;
  if p_bio is not null and length(p_bio)>5000 then raise exception 'Bio is too long'; end if;
  insert into public.gurubas(user_id,bio,guruba_type,location) values(v_uid,p_bio,p_guruba_type,p_location)
  on conflict(user_id) do update set bio=excluded.bio,guruba_type=excluded.guruba_type,location=excluded.location returning id into v_id;
  update public.profiles set gotra_id=p_gotra_id,latitude=p_latitude,longitude=p_longitude,address=p_address where id=v_uid;
  return v_id;
end; $$;

create or replace function public.request_topup(p_amount integer) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount<=0 or p_amount>1000000 then raise exception 'Invalid top-up amount'; end if;
  if exists(select 1 from public.topup_requests where user_id=v_uid and status='pending' and created_at>now()-interval '5 minutes') then raise exception 'A recent top-up request is already pending'; end if;
  insert into public.topup_requests(user_id,amount,status) values(v_uid,p_amount,'pending') returning id into v_id;
  return v_id;
end; $$;

create or replace function public.save_my_location(p_name text,p_latitude double precision,p_longitude double precision,p_address text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid; v_count integer;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_name is null or length(trim(p_name))=0 or length(trim(p_name))>80 then raise exception 'Invalid location name'; end if;
  if p_latitude<-90 or p_latitude>90 or p_longitude<-180 or p_longitude>180 then raise exception 'Invalid coordinates'; end if;
  select count(*) into v_count from public.saved_locations where user_id=v_uid;
  if v_count>=5 then raise exception 'Maximum of 5 saved locations reached'; end if;
  insert into public.saved_locations(user_id,name,latitude,longitude,address) values(v_uid,trim(p_name),p_latitude,p_longitude,p_address) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.delete_my_location(p_location_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  delete from public.saved_locations where id=p_location_id and user_id=v_uid;
  if not found then raise exception 'Saved location not found'; end if;
end; $$;

create or replace function public.request_gotra(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_name is null or length(trim(p_name))<2 or length(trim(p_name))>120 then raise exception 'Invalid Gotra name'; end if;
  insert into public.gotras(name,status) values(trim(p_name),'pending') on conflict(name) do update set name=excluded.name returning id into v_id;
  return v_id;
end; $$;

create or replace function public.send_message(p_receiver_id uuid,p_content text,p_booking_id uuid default null,p_message_type text default 'text',p_metadata jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid; v_booking public.bookings%rowtype; v_guruba_user uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_receiver_id is null or p_receiver_id=v_uid then raise exception 'Invalid receiver'; end if;
  if not exists(select 1 from public.profiles where id=p_receiver_id) then raise exception 'Receiver not found'; end if;
  if p_content is null or length(trim(p_content))=0 or length(p_content)>5000 then raise exception 'Invalid message content'; end if;
  if p_message_type not in ('text','image','file') then raise exception 'Invalid message type'; end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then raise exception 'Invalid message metadata'; end if;
  if p_booking_id is not null then
    select * into v_booking from public.bookings where id=p_booking_id;
    if not found then raise exception 'Booking not found'; end if;
    select user_id into v_guruba_user from public.gurubas where id=v_booking.guruba_id;
    if not (v_uid=v_booking.user_id or v_uid=v_guruba_user) or not (p_receiver_id=v_booking.user_id or p_receiver_id=v_guruba_user) then raise exception 'Message participants are not part of this booking'; end if;
  end if;
  insert into public.messages(sender_id,receiver_id,content,booking_id,message_type,metadata)
  values(v_uid,p_receiver_id,trim(p_content),p_booking_id,p_message_type,p_metadata) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_set_guruba_verification(p_user_id uuid,p_approved boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='admin') then raise exception 'Admin access required'; end if;
  update public.gurubas set is_verified=p_approved,verification_requested_at=case when p_approved then verification_requested_at else null end where user_id=p_user_id;
  if not found then raise exception 'Guruba profile not found'; end if;
end; $$;

create or replace function public.admin_manage_gotra(p_action text,p_gotra_id uuid default null,p_name text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='admin') then raise exception 'Admin access required'; end if;
  if p_action='add' then
    if p_name is null or length(trim(p_name))<2 or length(trim(p_name))>120 then raise exception 'Invalid Gotra name'; end if;
    insert into public.gotras(name,status) values(trim(p_name),'approved') returning id into v_id; return v_id;
  elsif p_action='approve' then update public.gotras set status='approved' where id=p_gotra_id;
  elsif p_action='reject' then delete from public.gotras where id=p_gotra_id;
  else raise exception 'Invalid Gotra action'; end if;
  return p_gotra_id;
end; $$;

revoke insert,update,delete on public.profiles,public.gurubas,public.topup_requests,public.messages,public.saved_locations,public.gotras from authenticated;
revoke execute on function public.send_message(uuid,text) from public,anon,authenticated;
grant execute on function public.send_message(uuid,text,uuid,text,jsonb),public.update_my_profile(text,text,text,text,text,double precision,double precision,text,text[]),public.upsert_my_guruba_profile(text,text,text,text,double precision,double precision,text),public.request_topup(integer),public.save_my_location(text,double precision,double precision,text),public.delete_my_location(uuid),public.request_gotra(text),public.admin_set_guruba_verification(uuid,boolean),public.admin_manage_gotra(text,uuid,text) to authenticated;
