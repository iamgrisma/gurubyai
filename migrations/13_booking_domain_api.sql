-- Backend booking state-machine foundation.

create or replace function public.confirm_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_role text;
begin
  select role into v_role from public.profiles where id = (select auth.uid());
  if v_role not in ('guruba','admin') then raise exception 'Only the assigned Guruba or an administrator can confirm a booking'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_role <> 'admin' and not exists (select 1 from public.gurubas where id=v_booking.guruba_id and user_id=(select auth.uid())) then raise exception 'Access denied'; end if;
  if v_booking.status='awaiting_client_confirmation' then
    if v_booking.proposed_time is null or v_booking.proposed_time <= now() then raise exception 'The proposed time is no longer valid'; end if;
    update public.bookings set scheduled_at=proposed_time,status='confirmed',confirmation_deadline=null where id=p_booking_id;
  elsif v_booking.status='pending' then
    if v_booking.scheduled_at is null or v_booking.scheduled_at <= now() then raise exception 'A future scheduled time is required'; end if;
    update public.bookings set status='confirmed' where id=p_booking_id;
  else raise exception 'Booking cannot be confirmed from its current state'; end if;
end; $$;

create or replace function public.propose_booking_time(p_booking_id uuid,p_proposed_time timestamptz,p_confirmation_deadline timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_role text; v_deadline timestamptz;
begin
  select role into v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('guruba','admin') then raise exception 'Only the assigned Guruba or an administrator can propose a time'; end if;
  if p_proposed_time is null or p_proposed_time <= now() then raise exception 'Proposed time must be in the future'; end if;
  v_deadline := least(coalesce(p_confirmation_deadline, now()+interval '24 hours'), p_proposed_time-interval '5 minutes');
  if v_deadline <= now() then raise exception 'Confirmation deadline must be in the future'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_role <> 'admin' and not exists (select 1 from public.gurubas where id=v_booking.guruba_id and user_id=(select auth.uid())) then raise exception 'Access denied'; end if;
  if v_booking.status <> 'pending' then raise exception 'Only pending bookings can receive a proposed time'; end if;
  update public.bookings set proposed_time=p_proposed_time,confirmation_deadline=v_deadline,status='awaiting_client_confirmation' where id=p_booking_id;
end; $$;

create or replace function public.respond_booking_time(p_booking_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.user_id <> (select auth.uid()) then raise exception 'Access denied'; end if;
  if v_booking.status <> 'awaiting_client_confirmation' then raise exception 'Booking is not awaiting a time response'; end if;
  if p_accept then
    if v_booking.proposed_time is null or v_booking.proposed_time <= now() then raise exception 'The proposed time has expired'; end if;
    if v_booking.confirmation_deadline is not null and v_booking.confirmation_deadline <= now() then raise exception 'The confirmation deadline has expired'; end if;
    update public.bookings set scheduled_at=proposed_time,status='confirmed' where id=p_booking_id;
  else
    update public.bookings set status='cancelled' where id=p_booking_id;
  end if;
end; $$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_role text;
begin
  select role into v_role from public.profiles where id=(select auth.uid());
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_role='admin' then null;
  elsif v_booking.user_id=(select auth.uid()) then null;
  elsif exists (select 1 from public.gurubas where id=v_booking.guruba_id and user_id=(select auth.uid())) then null;
  else raise exception 'Access denied'; end if;
  if v_booking.status not in ('pending','confirmed','awaiting_client_confirmation') then raise exception 'Booking cannot be cancelled from its current state'; end if;
  update public.bookings set status='cancelled' where id=p_booking_id;
end; $$;

create or replace function public.complete_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_role text;
begin
  select role into v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('guruba','admin') then raise exception 'Only the assigned Guruba or an administrator can complete a booking'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_role <> 'admin' and not exists (select 1 from public.gurubas where id=v_booking.guruba_id and user_id=(select auth.uid())) then raise exception 'Access denied'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'Only confirmed bookings can be completed'; end if;
  if v_booking.scheduled_at is null or v_booking.scheduled_at > now() then raise exception 'Cannot complete before the scheduled time'; end if;
  update public.bookings set status='completed' where id=p_booking_id;
end; $$;

revoke execute on function public.confirm_booking(uuid) from public,anon;
revoke execute on function public.propose_booking_time(uuid,timestamptz,timestamptz) from public,anon;
revoke execute on function public.respond_booking_time(uuid,boolean) from public,anon;
revoke execute on function public.cancel_booking(uuid) from public,anon;
revoke execute on function public.complete_booking(uuid) from public,anon;
grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.propose_booking_time(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.respond_booking_time(uuid,boolean) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;

-- Direct client booking mutations are disabled; all writes go through domain operations.
revoke insert, update, delete on table public.bookings from anon,authenticated;
revoke insert, update, delete on table public.booking_services from anon,authenticated;