-- Performance: cover booking_requests.booking_id foreign key.
create index if not exists idx_booking_requests_booking_id
  on public.booking_requests(booking_id);
