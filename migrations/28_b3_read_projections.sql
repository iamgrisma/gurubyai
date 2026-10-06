-- B3 read projections: avoid broad profile row exposure in client-facing reads.
create or replace function public.get_my_profile()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role text,
  gotra_id uuid,
  address text,
  latitude double precision,
  longitude double precision,
  credits numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.email, p.full_name, p.phone, p.avatar_url, p.role::text,
         p.gotra_id, p.address, p.latitude, p.longitude, p.credits,
         p.created_at, p.updated_at
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.get_public_gurubas()
returns table (
  id uuid,
  user_id uuid,
  bio text,
  years_experience integer,
  rating numeric,
  location text,
  specialties text[],
  is_verified boolean,
  guruba_type text,
  languages text[],
  full_name text,
  avatar_url text,
  gotra_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select g.id, g.user_id, g.bio, g.years_experience, g.rating, g.location,
         g.specialties, g.is_verified, g.guruba_type, g.languages,
         p.full_name, p.avatar_url, p.gotra_id
  from public.gurubas g
  join public.profiles p on p.id = g.user_id
  where g.is_verified = true;
$$;

revoke all on function public.get_public_gurubas() from public, anon;
grant execute on function public.get_public_gurubas() to authenticated;
