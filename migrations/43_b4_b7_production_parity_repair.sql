-- B4/B7 production parity repair.
-- The event trigger uses ON CONFLICT (idempotency_key), so the queue key
-- must be backed by a non-partial unique index.
drop index if exists public.uq_job_queue_idempotency_key;
create unique index uq_job_queue_idempotency_key
  on public.job_queue(idempotency_key);

-- Restore the B4 cancellation/refund contract in production.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.bookings%rowtype;
  v_role text;
  v_ref text;
begin
  select role into v_role from public.profiles where id = (select auth.uid());
  select * into v_booking from public.bookings where id = p_booking_id for update;

  if not found then raise exception 'Booking not found'; end if;

  if v_role = 'admin' then
    null;
  elsif v_booking.user_id = (select auth.uid()) then
    null;
  elsif exists (
    select 1 from public.gurubas g
    where g.id = v_booking.guruba_id and g.user_id = (select auth.uid())
  ) then
    null;
  else
    raise exception 'Access denied';
  end if;

  if v_booking.status not in ('pending','confirmed','awaiting_client_confirmation') then
    raise exception 'Booking cannot be cancelled from its current state';
  end if;

  update public.bookings set status = 'cancelled' where id = p_booking_id;

  if coalesce(v_booking.platform_fee,0) > 0 then
    v_ref := 'booking-refund:' || p_booking_id::text;

    if not exists (select 1 from public.transactions where reference_key = v_ref) then
      update public.profiles
      set credits = credits + v_booking.platform_fee
      where id = v_booking.user_id;

      insert into public.transactions(
        user_id, amount, type, description, status, reference_key
      )
      values (
        v_booking.user_id,
        v_booking.platform_fee,
        'credit',
        'Booking fee refund',
        'completed',
        v_ref
      );
    end if;
  end if;
end;
$function$;

revoke execute on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;
