-- B2/B3: restrict direct profile exposure and expose explicit read projections.
-- Production companion: 20261007000320_b2_b3_profile_projection_security

drop policy if exists "profiles_public_select" on public.profiles;
create policy "profiles_authenticated_select"
  on public.profiles
  for select
  to authenticated
  using (true);

drop function if exists public.get_public_gurubas();
create function public.get_public_gurubas()
returns table(
  guruba_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  years_experience integer,
  rating numeric,
  location text,
  specialties text[],
  languages text[],
  guruba_type text,
  review_count integer,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.id, g.user_id, p.full_name, p.avatar_url,
         g.bio, g.years_experience, g.rating, g.location,
         g.specialties, g.languages, g.guruba_type,
         g.review_count, g.is_verified
  from public.gurubas g
  join public.profiles p on p.id = g.user_id
  where g.is_verified = true;
$$;

revoke execute on function public.get_public_gurubas() from public;
grant execute on function public.get_public_gurubas() to anon, authenticated;

drop function if exists public.get_my_profile();
create function public.get_my_profile()
returns table(
  id uuid,
  full_name text,
  role text,
  avatar_url text,
  gotra_id uuid,
  city text,
  languages text[],
  latitude double precision,
  longitude double precision,
  address text,
  credits integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.id,p.full_name,p.role,p.avatar_url,p.gotra_id,p.city,p.languages,
         p.latitude,p.longitude,p.address,p.credits
  from public.profiles p
  where p.id=auth.uid();
$$;

revoke execute on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;