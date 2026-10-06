-- B2: consolidate overlapping permissive RLS policies for core tables.
-- Keeps the intended authorization paths while avoiding redundant OR-ed policies.

begin;

drop policy if exists "Admins can manage bookings" on public.bookings;
drop policy if exists "Admins can view all bookings" on public.bookings;
drop policy if exists "Clients can view own bookings" on public.bookings;
drop policy if exists "Gurubas can view assigned bookings" on public.bookings;
drop policy if exists "Clients can create bookings" on public.bookings;
drop policy if exists "Clients can update own bookings" on public.bookings;
drop policy if exists "Gurubas can update assigned bookings" on public.bookings;

create policy "bookings_select_access" on public.bookings
  for select to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.gurubas g
      where g.id = bookings.guruba_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "bookings_insert_access" on public.bookings
  for insert to authenticated
  with check (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

create policy "bookings_update_access" on public.bookings
  for update to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.gurubas g
      where g.id = bookings.guruba_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.gurubas g
      where g.id = bookings.guruba_id
        and g.user_id = (select auth.uid())
    )
  );

drop policy if exists "b2_gurubas_admin_write" on public.gurubas;
drop policy if exists "Guruba insert own data" on public.gurubas;
drop policy if exists "b2_gurubas_owner_insert" on public.gurubas;
drop policy if exists "Public read gurubas" on public.gurubas;
drop policy if exists "b2_gurubas_public_read" on public.gurubas;
drop policy if exists "b2_gurubas_owner_update" on public.gurubas;

create policy "gurubas_public_select" on public.gurubas
  for select to anon, authenticated
  using (true);

create policy "gurubas_owner_or_admin_insert" on public.gurubas
  for insert to authenticated
  with check (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

create policy "gurubas_owner_or_admin_update" on public.gurubas
  for update to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  )
  with check (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

create policy "gurubas_owner_or_admin_delete" on public.gurubas
  for delete to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

drop policy if exists "Admins manage notifications" on public.notifications;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;

create policy "notifications_select_access" on public.notifications
  for select to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Admins can manage topups" on public.topup_requests;
drop policy if exists "Users can delete own pending topups" on public.topup_requests;
drop policy if exists "Users can create own topups" on public.topup_requests;
drop policy if exists "Users can view own topups" on public.topup_requests;

create policy "topups_select_access" on public.topup_requests
  for select to authenticated
  using (
    (select is_admin((select auth.uid())))
    or user_id = (select auth.uid())
  );

create policy "topups_insert_access" on public.topup_requests
  for insert to authenticated
  with check (
    (select is_admin((select auth.uid())))
    or (user_id = (select auth.uid()) and status = 'pending')
  );

create policy "topups_delete_access" on public.topup_requests
  for delete to authenticated
  using (
    (select is_admin((select auth.uid())))
    or (user_id = (select auth.uid()) and status = 'pending')
  );

create policy "topups_update_admin" on public.topup_requests
  for update to authenticated
  using ((select is_admin((select auth.uid()))))
  with check ((select is_admin((select auth.uid()))));

commit;
