-- B2: consolidate RLS policies into a small, explicit role/ownership surface.
-- Client mutations that have domain RPCs are intentionally revoked separately.
-- This migration is safe to re-run because policy drops are explicit.

begin;

-- SERVICES: public read, admin write.
drop policy if exists "Services are viewable by everyone" on public.services;
drop policy if exists "Public can read services" on public.services;
drop policy if exists "Admins can manage services" on public.services;
create policy "b2_services_public_read"
  on public.services for select
  to anon, authenticated
  using (true);
create policy "b2_services_admin_write"
  on public.services for all
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- GURUBAS: public read, owner update/insert, admin write.
drop policy if exists "Gurubas are viewable by everyone" on public.gurubas;
drop policy if exists "Gurubas can update own details" on public.gurubas;
drop policy if exists "Gurubas can insert own profile" on public.gurubas;
drop policy if exists "Admins can update gurubas" on public.gurubas;
create policy "b2_gurubas_public_read"
  on public.gurubas for select
  to anon, authenticated
  using (true);
create policy "b2_gurubas_owner_insert"
  on public.gurubas for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "b2_gurubas_owner_update"
  on public.gurubas for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "b2_gurubas_admin_write"
  on public.gurubas for all
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- GURUBA SERVICES: public read, owner write. B3 revokes direct mutation,
-- but retaining the policy makes the RLS boundary explicit and harmless.
drop policy if exists "Guruba services public view" on public.guruba_services;
drop policy if exists "Gurubas manage own services" on public.guruba_services;
create policy "b2_guruba_services_public_read"
  on public.guruba_services for select
  to anon, authenticated
  using (true);
create policy "b2_guruba_services_owner_write"
  on public.guruba_services for all
  to authenticated
  using (exists (
    select 1 from public.gurubas g
    where g.id = guruba_services.guruba_id
      and g.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.gurubas g
    where g.id = guruba_services.guruba_id
      and g.user_id = (select auth.uid())
  ));

-- AVAILABILITY: public read, Guruba owner write.
drop policy if exists "Availability is viewable by everyone" on public.guruba_availability;
drop policy if exists "Gurubas manage own availability" on public.guruba_availability;
create policy "b2_availability_public_read"
  on public.guruba_availability for select
  to anon, authenticated
  using (true);
create policy "b2_availability_owner_write"
  on public.guruba_availability for all
  to authenticated
  using (exists (
    select 1 from public.gurubas g
    where g.id = guruba_availability.guruba_id
      and g.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.gurubas g
    where g.id = guruba_availability.guruba_id
      and g.user_id = (select auth.uid())
  ));

-- BOOKINGS: reads only. All booking writes are domain RPCs.
drop policy if exists "Users can create bookings" on public.bookings;
drop policy if exists "Users create bookings" on public.bookings;
drop policy if exists "Clients can create bookings" on public.bookings;
drop policy if exists "Users can update own bookings" on public.bookings;
drop policy if exists "Clients can update own bookings" on public.bookings;
drop policy if exists "Gurubas can update assigned bookings" on public.bookings;
drop policy if exists "Admins can manage bookings" on public.bookings;
drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Clients can view own bookings" on public.bookings;
drop policy if exists "Gurubas can view assigned bookings" on public.bookings;
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "b2_bookings_client_read"
  on public.bookings for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "b2_bookings_guruba_read"
  on public.bookings for select
  to authenticated
  using (exists (
    select 1 from public.gurubas g
    where g.id = bookings.guruba_id
      and g.user_id = (select auth.uid())
  ));
create policy "b2_bookings_admin_read"
  on public.bookings for select
  to authenticated
  using ((select public.is_admin((select auth.uid()))));

-- BOOKING SERVICES: read only; mutation is part of booking domain.
drop policy if exists "Users can view booking services" on public.booking_services;
drop policy if exists "Users can insert booking services" on public.booking_services;
create policy "b2_booking_services_read"
  on public.booking_services for select
  to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_services.booking_id
      and (
        b.user_id = (select auth.uid())
        or exists (
          select 1 from public.gurubas g
          where g.id = b.guruba_id
            and g.user_id = (select auth.uid())
        )
        or (select public.is_admin((select auth.uid())))
      )
  ));

-- CUSTOM SERVICES: client owns request; admin moderates.
drop policy if exists "Users can view own custom services" on public.custom_services;
drop policy if exists "Users can create custom services" on public.custom_services;
drop policy if exists "Admins can view all custom services" on public.custom_services;
drop policy if exists "Admins can update custom services" on public.custom_services;
create policy "b2_custom_services_client_read"
  on public.custom_services for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "b2_custom_services_client_insert"
  on public.custom_services for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');
create policy "b2_custom_services_admin_read"
  on public.custom_services for select
  to authenticated
  using ((select public.is_admin((select auth.uid()))));
create policy "b2_custom_services_admin_update"
  on public.custom_services for update
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- MESSAGES: read only; sending/reads are domain RPCs.
drop policy if exists "Users can view their messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can update their received messages" on public.messages;
drop policy if exists "Users can delete own messages" on public.messages;
create policy "b2_messages_participant_read"
  on public.messages for select
  to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

-- NOTIFICATIONS: recipient read/update; admin support.
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Admins manage notifications" on public.notifications;
drop policy if exists "System can create notifications" on public.notifications;
create policy "b2_notifications_recipient_read"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "b2_notifications_recipient_update"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "b2_notifications_admin"
  on public.notifications for all
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- REVIEWS: read-only client surface; creation is domain RPC.
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
drop policy if exists "Users can create reviews for their bookings" on public.reviews;
create policy "b2_reviews_public_read"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- GOTRAS: authenticated read; mutation is domain API.
drop policy if exists "Gotras are viewable by authenticated users" on public.gotras;
drop policy if exists "Authenticated users can request gotras" on public.gotras;
drop policy if exists "Admins can manage gotras" on public.gotras;
create policy "b2_gotras_authenticated_read"
  on public.gotras for select
  to authenticated
  using (true);
create policy "b2_gotras_admin_write"
  on public.gotras for all
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- TOPUPS: client reads own pending/history; creation via request_topup RPC.
drop policy if exists "Users can see and create own topups" on public.topup_requests;
drop policy if exists "Users can view own topups" on public.topup_requests;
drop policy if exists "Users can create own topups" on public.topup_requests;
drop policy if exists "Users can delete own pending topups" on public.topup_requests;
drop policy if exists "Admins can manage topups" on public.topup_requests;
create policy "b2_topups_client_read"
  on public.topup_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "b2_topups_admin"
  on public.topup_requests for all
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- SAVED LOCATIONS: read only; save/delete via domain API.
drop policy if exists "Users manage own saved locations" on public.saved_locations;
create policy "b2_saved_locations_read"
  on public.saved_locations for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- TRANSACTIONS: immutable read surface.
drop policy if exists "Users view own transactions" on public.transactions;
drop policy if exists "Admins view all transactions" on public.transactions;
create policy "b2_transactions_client_read"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "b2_transactions_admin_read"
  on public.transactions for select
  to authenticated
  using ((select public.is_admin((select auth.uid()))));

-- PROFILES: keep public-safe directory fields readable; full-row mutation is RPC controlled.
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "b2_profiles_authenticated_read"
  on public.profiles for select
  to authenticated
  using (true);
create policy "b2_profiles_owner_update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "b2_profiles_admin_update"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- JOB QUEUE: internal only; no Data API policies for client roles.
revoke all on public.job_queue from anon, authenticated;

commit;
