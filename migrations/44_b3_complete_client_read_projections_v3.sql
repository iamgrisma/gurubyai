-- B3 client/owner read projections used by production
drop function if exists public.get_my_guruba_profile();

create or replace function public.get_public_services()
returns setof public.services
language sql security invoker set search_path=public,pg_temp
as $$ select s.* from public.services s order by s.title; $$;

create or replace function public.get_public_service(p_service_id uuid)
returns setof public.services
language sql security invoker set search_path=public,pg_temp
as $$ select s.* from public.services s where s.id=p_service_id; $$;

create or replace function public.get_public_booking_options(p_service_id uuid)
returns jsonb
language sql security definer set search_path=public,pg_temp
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'guruba_id',gs.guruba_id,'service_id',gs.service_id,'is_online',gs.is_online,
  'custom_price',gs.custom_price,'guruba',jsonb_build_object(
    'id',g.id,'user_id',g.user_id,'bio',g.bio,'years_experience',g.years_experience,
    'rating',g.rating,'location',g.location,'specialties',g.specialties,'languages',g.languages,
    'guruba_type',g.guruba_type,'review_count',g.review_count,'is_verified',g.is_verified,
    'full_name',p.full_name,'avatar_url',p.avatar_url
  )
) order by g.rating desc nulls last,g.created_at desc),'[]'::jsonb)
from public.guruba_services gs
join public.gurubas g on g.id=gs.guruba_id
join public.profiles p on p.id=g.user_id
where gs.service_id=p_service_id and g.is_verified=true;
$$;

create or replace function public.get_approved_gotras()
returns setof public.gotras
language sql security invoker set search_path=public,pg_temp
as $$ select g.* from public.gotras g where g.status='approved' order by g.name; $$;

create or replace function public.get_my_guruba_profile()
returns setof jsonb
language sql security invoker set search_path=public,pg_temp
as $$
select jsonb_build_object(
  'id',g.id,'user_id',g.user_id,'bio',g.bio,'years_experience',g.years_experience,
  'rating',g.rating,'location',g.location,'specialties',g.specialties,'languages',g.languages,
  'guruba_type',g.guruba_type,'review_count',g.review_count,'is_verified',g.is_verified,
  'verification_requested_at',g.verification_requested_at,
  'profiles',jsonb_build_object(
    'id',p.id,'full_name',p.full_name,'avatar_url',p.avatar_url,'gotra_id',p.gotra_id,
    'city',p.city,'languages',p.languages,'latitude',p.latitude,'longitude',p.longitude,'address',p.address
  )
)
from public.gurubas g join public.profiles p on p.id=g.user_id
where g.user_id=(select auth.uid()) limit 1;
$$;

create or replace function public.get_my_guruba_services()
returns setof public.guruba_services
language sql security invoker set search_path=public,pg_temp
as $$ select gs.* from public.guruba_services gs join public.gurubas g on g.id=gs.guruba_id where g.user_id=(select auth.uid()) order by gs.created_at desc; $$;

create or replace function public.get_my_availability()
returns setof public.guruba_availability
language sql security invoker set search_path=public,pg_temp
as $$ select ga.* from public.guruba_availability ga join public.gurubas g on g.id=ga.guruba_id where g.user_id=(select auth.uid()) order by ga.day_of_week; $$;

create or replace function public.set_my_availability_day(p_day_of_week integer,p_start_time time,p_end_time time)
returns public.guruba_availability
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_guruba_id uuid; v_row public.guruba_availability;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if p_day_of_week<0 or p_day_of_week>6 then raise exception 'Invalid day_of_week'; end if;
 if p_start_time>=p_end_time then raise exception 'End time must be after start time'; end if;
 select g.id into v_guruba_id from public.gurubas g where g.user_id=(select auth.uid()) limit 1;
 if v_guruba_id is null then raise exception 'Guruba profile not found'; end if;
 insert into public.guruba_availability(guruba_id,day_of_week,start_time,end_time)
 values(v_guruba_id,p_day_of_week,p_start_time,p_end_time)
 on conflict(guruba_id,day_of_week) do update set start_time=excluded.start_time,end_time=excluded.end_time
 returning * into v_row;
 return v_row;
end;
$$;

create or replace function public.delete_my_availability_day(p_day_of_week integer)
returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_guruba_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if p_day_of_week<0 or p_day_of_week>6 then raise exception 'Invalid day_of_week'; end if;
 select g.id into v_guruba_id from public.gurubas g where g.user_id=(select auth.uid()) limit 1;
 if v_guruba_id is null then return false; end if;
 delete from public.guruba_availability where guruba_id=v_guruba_id and day_of_week=p_day_of_week;
 return found;
end;
$$;

create or replace function public.get_my_reviewed_booking_ids()
returns table(booking_id uuid)
language sql security invoker set search_path=public,pg_temp
as $$ select r.booking_id from public.reviews r where r.user_id=(select auth.uid()) order by r.created_at desc; $$;

create or replace function public.admin_get_gotras()
returns setof public.gotras
language sql security definer set search_path=public,pg_temp
as $$ select g.* from public.gotras g where public.is_admin((select auth.uid())) order by g.name; $$;

revoke all on function public.get_public_services() from public,authenticated,anon;
grant execute on function public.get_public_services() to anon,authenticated;
revoke all on function public.get_public_service(uuid) from public,authenticated,anon;
grant execute on function public.get_public_service(uuid) to anon,authenticated;
revoke all on function public.get_public_booking_options(uuid) from public,authenticated,anon;
grant execute on function public.get_public_booking_options(uuid) to anon,authenticated;
revoke all on function public.get_approved_gotras() from public,authenticated,anon;
grant execute on function public.get_approved_gotras() to authenticated;
revoke all on function public.get_my_guruba_profile() from public,authenticated,anon;
grant execute on function public.get_my_guruba_profile() to authenticated;
revoke all on function public.get_my_guruba_services() from public,authenticated,anon;
grant execute on function public.get_my_guruba_services() to authenticated;
revoke all on function public.get_my_availability() from public,authenticated,anon;
grant execute on function public.get_my_availability() to authenticated;
revoke all on function public.set_my_availability_day(integer,time,time) from public,authenticated,anon;
grant execute on function public.set_my_availability_day(integer,time,time) to authenticated;
revoke all on function public.delete_my_availability_day(integer) from public,authenticated,anon;
grant execute on function public.delete_my_availability_day(integer) to authenticated;
revoke all on function public.get_my_reviewed_booking_ids() from public,authenticated,anon;
grant execute on function public.get_my_reviewed_booking_ids() to authenticated;
revoke all on function public.admin_get_gotras() from public,authenticated,anon;
grant execute on function public.admin_get_gotras() to authenticated;
