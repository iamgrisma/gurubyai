create or replace function public.set_booking_meeting_link(p_booking_id uuid,p_meeting_link text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_role text; v_link text;
begin
  select role into v_role from public.profiles where id=(select auth.uid());
  v_link := nullif(trim(p_meeting_link),'');
  if v_link is null or v_link !~* '^https?://[^[:space:]]+$' then
    raise exception 'A valid meeting URL is required';
  end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_role='admin' then null;
  elsif exists (select 1 from public.gurubas where id=v_booking.guruba_id and user_id=(select auth.uid())) then null;
  else raise exception 'Access denied'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'Meeting link can only be added to confirmed bookings'; end if;
  update public.bookings set meeting_link=v_link where id=p_booking_id;
end; $$;

revoke execute on function public.set_booking_meeting_link(uuid,text) from public,anon;
grant execute on function public.set_booking_meeting_link(uuid,text) to authenticated;