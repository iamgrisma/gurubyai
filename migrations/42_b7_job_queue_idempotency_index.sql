-- B7 production repair: the booking-event trigger uses ON CONFLICT(idempotency_key).
-- Keep the uniqueness contract present in production so booking status changes can enqueue events safely.
create unique index if not exists uq_job_queue_idempotency_key
  on public.job_queue(idempotency_key)
  where idempotency_key is not null;
