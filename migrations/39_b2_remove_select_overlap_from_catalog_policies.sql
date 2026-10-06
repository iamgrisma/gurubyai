-- B2: remove SELECT overlap caused by FOR ALL owner/admin policies.
-- Public catalog SELECT remains unchanged; owner/admin writes are split by command
-- so authenticated SELECT does not inherit an overlapping ALL policy.

begin;

drop policy if exists "guruba_availability_owner_write" on public.guruba_availability;
create policy "guruba_availability_owner_insert" on public.guruba_availability
  for insert to authenticated
  with check (exists (select 1 from public.gurubas g where g.id=guruba_availability.guruba_id and g.user_id=(select auth.uid())));
create policy "guruba_availability_owner_update" on public.guruba_availability
  for update to authenticated
  using (exists (select 1 from public.gurubas g where g.id=guruba_availability.guruba_id and g.user_id=(select auth.uid())))
  with check (exists (select 1 from public.gurubas g where g.id=guruba_availability.guruba_id and g.user_id=(select auth.uid())));
create policy "guruba_availability_owner_delete" on public.guruba_availability
  for delete to authenticated
  using (exists (select 1 from public.gurubas g where g.id=guruba_availability.guruba_id and g.user_id=(select auth.uid())));

drop policy if exists "guruba_services_owner_write" on public.guruba_services;
create policy "guruba_services_owner_insert" on public.guruba_services
  for insert to authenticated
  with check (exists (select 1 from public.gurubas g where g.id=guruba_services.guruba_id and g.user_id=(select auth.uid())));
create policy "guruba_services_owner_update" on public.guruba_services
  for update to authenticated
  using (exists (select 1 from public.gurubas g where g.id=guruba_services.guruba_id and g.user_id=(select auth.uid())))
  with check (exists (select 1 from public.gurubas g where g.id=guruba_services.guruba_id and g.user_id=(select auth.uid())));
create policy "guruba_services_owner_delete" on public.guruba_services
  for delete to authenticated
  using (exists (select 1 from public.gurubas g where g.id=guruba_services.guruba_id and g.user_id=(select auth.uid())));

drop policy if exists "b2_services_admin_write" on public.services;
create policy "services_admin_insert" on public.services
  for insert to authenticated
  with check ((select is_admin((select auth.uid()))));
create policy "services_admin_update" on public.services
  for update to authenticated
  using ((select is_admin((select auth.uid()))))
  with check ((select is_admin((select auth.uid()))));
create policy "services_admin_delete" on public.services
  for delete to authenticated
  using ((select is_admin((select auth.uid()))));

commit;
