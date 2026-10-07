-- B3 security hardening: authenticated users may read only their own profile directly.
-- Public Guruba discovery remains available through get_public_gurubas().
drop policy if exists "profiles_authenticated_select" on public.profiles;

create policy "profiles_authenticated_select"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);
