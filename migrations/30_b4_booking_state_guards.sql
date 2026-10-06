-- B4: prevent terminal bookings from being rescheduled/completed/cancelled repeatedly.
begin;

create or replace function public.complete_booking(p_booking_id uuid)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_booking public.bookings%rowtype;
begin
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 if not ((select auth.uid())=v_booking.user_id or (select auth.uid())=(select user_id from public.gurubas where id=v_booking.guruba_id) or (select role from public.profiles where id=(select auth.uid()))='admin') then
   raise exception 'Not authorized';
 end if;
 if v_booking.status <> 'confirmed' then raise exception 'Only confirmed bookings can be completed'; end if;
 update public.bookings set status='completed', updated_at=now() where id=p_booking_id;
 return true;
end $$;

revoke all on function public.complete_booking(uuid) from public,anon;
grant execute on function public.complete_booking(uuid) to authenticated;

commit;
