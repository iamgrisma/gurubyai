-- B2: remove anonymous direct access to the sensitive profiles table.
-- Public Guruba discovery remains available through the explicit projection RPC.
create or replace function public.get_public_gurubas()
returns table (
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
  is_verified boolean,
  gotra_id uuid
)
language sql stable security definer
set search_path=public,pg_temp
as $$
  select g.id,g.user_id,p.full_name,p.avatar_url,g.bio,g.years_experience,g.rating,
         g.location,g.specialties,g.languages,g.guruba_type,g.review_count,
         g.is_verified,p.gotra_id
  from public.gurubas g
  join public.profiles p on p.id=g.user_id
  where g.is_verified=true;
$$;

revoke select on public.profiles from anon;
revoke execute on function public.get_public_gurubas() from public;
grant execute on function public.get_public_gurubas() to anon,authenticated;
