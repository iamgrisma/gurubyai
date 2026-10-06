-- B7 retire the legacy booking_notification queue producer.
-- Domain events are now the canonical booking event path.
drop trigger if exists on_booking_change on public.bookings;

update public.job_queue
set status='failed',
    completed_at=coalesce(completed_at, now()),
    last_error=coalesce(last_error, 'Legacy booking_notification queue retired; canonical domain_events path is active')
where job_type='booking_notification'
  and status in ('pending','processing');

revoke execute on function public.handle_booking_notification() from public, anon, authenticated;
