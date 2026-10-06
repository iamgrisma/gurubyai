-- Tighten exposed Data API grants and RLS policies.

drop policy if exists "Admin insert services" on public.services;
drop policy if exists "Services are viewable by everyone" on public.services;
drop policy if exists "Public read services" on public.services;
drop policy if exists "Admins can manage services" on public.services;
create policy "Public can read services" on public.services for select to anon, authenticated using (true);
create policy "Admins can manage services" on public.services for all to authenticated
using ((select public.is_admin(auth.uid()))) with check ((select public.is_admin(auth.uid())));

drop policy if exists "Admins can manage bookings" on public.bookings;
drop policy if exists "Gurubas can update assigned bookings" on public.bookings;
drop policy if exists "Gurubas can view assigned bookings" on public.bookings;
drop policy if exists "Users can create bookings" on public.bookings;
drop policy if exists "Users create bookings" on public.bookings;
drop policy if exists "Users can update own bookings" on public.bookings;
drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Users view own bookings" on public.bookings;
create policy "Clients can view own bookings" on public.bookings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Gurubas can view assigned bookings" on public.bookings for select to authenticated
using (exists (select 1 from public.gurubas g where g.id = bookings.guruba_id and g.user_id = (select auth.uid())));
create policy "Admins can view all bookings" on public.bookings for select to authenticated using ((select public.is_admin(auth.uid())));
create policy "Clients can create bookings" on public.bookings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Admins can manage bookings" on public.bookings for all to authenticated
using ((select public.is_admin(auth.uid()))) with check ((select public.is_admin(auth.uid())));
create policy "Clients can update own bookings" on public.bookings for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Gurubas can update assigned bookings" on public.bookings for update to authenticated
using (exists (select 1 from public.gurubas g where g.id = bookings.guruba_id and g.user_id = (select auth.uid())))
with check (exists (select 1 from public.gurubas g where g.id = bookings.guruba_id and g.user_id = (select auth.uid())));

drop policy if exists "Users can see and create own topups" on public.topup_requests;
drop policy if exists "Admins can manage topups" on public.topup_requests;
create policy "Users can view own topups" on public.topup_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own topups" on public.topup_requests for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Users can delete own pending topups" on public.topup_requests for delete to authenticated
using ((select auth.uid()) = user_id and status = 'pending');
create policy "Admins can manage topups" on public.topup_requests for all to authenticated
using ((select public.is_admin(auth.uid()))) with check ((select public.is_admin(auth.uid())));

drop policy if exists "System can create notifications" on public.notifications;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can update own notifications" on public.notifications for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Admins manage notifications" on public.notifications for all to authenticated
using ((select public.is_admin(auth.uid()))) with check ((select public.is_admin(auth.uid())));

revoke select on table public.profiles from anon;
grant select (id, full_name, gotra_id, avatar_url) on table public.profiles to anon;
revoke update on table public.profiles from authenticated;
grant update (full_name, phone, gotra_id, avatar_url, city, languages, latitude, longitude, address) on table public.profiles to authenticated;
revoke insert, delete on table public.profiles from anon, authenticated;

revoke insert, update, delete on table public.services from anon;
revoke select, insert, update, delete on table public.bookings from anon;
revoke select, insert, update, delete on table public.topup_requests from anon;
revoke select, insert, update, delete on table public.notifications from anon;
revoke select, insert, update, delete on table public.transactions from anon;
