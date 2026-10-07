-- B11: durable Expo push delivery outbox and per-device delivery state.
begin;

create table if not exists public.notification_push_deliveries (
  id uuid default uuid_generate_v4() primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.notification_devices(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','failed_permanent')),
  attempts integer not null default 0,
  expo_ticket_id text,
  last_error text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, device_id)
);

create index if not exists idx_notification_push_deliveries_pending
  on public.notification_push_deliveries(notification_id, status, created_at);

alter table public.notification_push_deliveries enable row level security;
revoke all on public.notification_push_deliveries from anon, authenticated;

create or replace function public.queue_notification_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.job_queue(job_type,payload,idempotency_key)
  values(
    'notification_push',
    jsonb_build_object('notification_id',new.id,'user_id',new.user_id),
    'notification-push:' || new.id::text
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$function$;

drop trigger if exists trg_queue_notification_push on public.notifications;
create trigger trg_queue_notification_push
after insert on public.notifications
for each row
execute function public.queue_notification_push();

revoke all on function public.queue_notification_push() from public, anon, authenticated;

commit;
