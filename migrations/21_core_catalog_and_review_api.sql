-- Core catalog and review API (B3)
create or replace function public.set_my_guruba_service(p_service_id uuid,p_enabled boolean,p_online boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_gid uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select id into v_gid from public.gurubas where user_id=v_uid;
  if v_gid is null then raise exception 'Guruba profile not found'; end if;
  if not exists(select 1 from public.services where id=p_service_id) then raise exception 'Service not found'; end if;
  if p_enabled then
    insert into public.guruba_services(guruba_id,service_id,is_online) values(v_gid,p_service_id,coalesce(p_online,false))
    on conflict(guruba_id,service_id) do update set is_online=excluded.is_online;
  else delete from public.guruba_services where guruba_id=v_gid and service_id=p_service_id;
  end if;
end; $$;

create or replace function public.create_review(p_booking_id uuid,p_rating integer,p_comment text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_gid uuid; v_id uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_rating is null or p_rating<1 or p_rating>5 then raise exception 'Rating must be between 1 and 5'; end if;
  if p_comment is not null and length(p_comment)>2000 then raise exception 'Review is too long'; end if;
  select guruba_id into v_gid from public.bookings where id=p_booking_id and user_id=v_uid and status='completed';
  if v_gid is null then raise exception 'Only completed bookings owned by you can be reviewed'; end if;
  if exists(select 1 from public.reviews where booking_id=p_booking_id) then raise exception 'Booking already reviewed'; end if;
  insert into public.reviews(booking_id,guruba_id,user_id,rating,comment) values(p_booking_id,v_gid,v_uid,p_rating,nullif(trim(p_comment),'')) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_upsert_service(p_service_id uuid default null,p_title text default null,p_description text default null,p_base_price integer default 0,p_duration_minutes integer default 0,p_image_url text default null,p_category text default null,p_is_featured boolean default false,p_is_online_enabled boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='admin') then raise exception 'Admin access required'; end if;
  if p_title is null or length(trim(p_title))<2 or length(trim(p_title))>160 then raise exception 'Invalid service title'; end if;
  if p_base_price<0 or p_duration_minutes<0 then raise exception 'Invalid service price or duration'; end if;
  if p_description is not null and length(p_description)>5000 then raise exception 'Description is too long'; end if;
  if p_service_id is null then
    insert into public.services(title,description,base_price,duration_minutes,image_url,category,is_featured,is_online_enabled)
    values(trim(p_title),p_description,p_base_price,p_duration_minutes,p_image_url,p_category,p_is_featured,p_is_online_enabled) returning id into v_id;
  else
    update public.services set title=trim(p_title),description=p_description,base_price=p_base_price,duration_minutes=p_duration_minutes,
      image_url=p_image_url,category=p_category,is_featured=p_is_featured,is_online_enabled=p_is_online_enabled
    where id=p_service_id returning id into v_id;
    if v_id is null then raise exception 'Service not found'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.admin_delete_service(p_service_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='admin') then raise exception 'Admin access required'; end if;
  delete from public.services where id=p_service_id;
  if not found then raise exception 'Service not found'; end if;
end; $$;

revoke insert,update,delete on public.guruba_services,public.reviews,public.services from authenticated;
grant execute on function public.set_my_guruba_service(uuid,boolean,boolean),public.create_review(uuid,integer,text),public.admin_upsert_service(uuid,text,text,integer,integer,text,text,boolean,boolean),public.admin_delete_service(uuid) to authenticated;
