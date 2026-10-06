-- B7: durable booking outbox/events and in-app notification side effects.

begin;

create table if not exists public.booking_events (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_booking_events_booking_created
  on public.booking_events(booking_id, created_at desc);

create table if not exists public.domain_events (
  id uuid default uuid_generate_v4() primary key,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  processed_at timestamptz
);

create index if not exists idx_domain_events_unprocessed
  on public.domain_events(created_at)
  where processed_at is null;

alter table public.booking_events enable row level security;
alter table public.domain_events enable row level security;
revoke all on public.booking_events from anon, authenticated;
revoke all on public.domain_events from anon, authenticated;

create or replace function public.emit_booking_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_type text;
  v_payload jsonb;
  v_user_id uuid;
  v_guruba_user_id uuid;
  v_title text;
  v_message text;
begin
  if tg_op = 'INSERT' then
    v_type := 'booking.created';
  elsif old.status is distinct from new.status then
    v_type := 'booking.status_changed';
  elsif old.scheduled_at is distinct from new.scheduled_at then
    v_type := 'booking.rescheduled';
  else
    return new;
  end if;

  v_payload := jsonb_build_object(
    'booking_id', new.id,
    'user_id', new.user_id,
    'guruba_id', new.guruba_id,
    'status', new.status,
    'scheduled_at', new.scheduled_at,
    'previous_status', case when tg_op = 'UPDATE' then old.status else null end
  );

  insert into public.booking_events(booking_id,event_type,payload)
  values(new.id,v_type,v_payload);

  insert into public.domain_events(aggregate_type,aggregate_id,event_type,payload)
  values('booking',new.id,v_type,v_payload);

  select g.user_id into v_guruba_user_id
  from public.gurubas g
  where g.id = new.guruba_id;

  if tg_op = 'INSERT' then
    v_title := 'New booking request';
    v_message := 'A new booking request has been created.';
    if v_guruba_user_id is not null then
      insert into public.notifications(
        user_id,title,message,notification_type,metadata
      ) values(
        v_guruba_user_id,v_title,v_message,'booking',
        jsonb_build_object('booking_id',new.id,'event','booking.created')
      );
    end if;
  elsif new.status = 'confirmed' then
    v_title := 'Booking confirmed';
    v_message := 'Your booking has been confirmed.';
    insert into public.notifications(
      user_id,title,message,notification_type,metadata
    ) values(
      new.user_id,v_title,v_message,'booking',
      jsonb_build_object('booking_id',new.id,'event','booking.confirmed')
    );
  elsif new.status = 'cancelled' then
    v_title := 'Booking cancelled';
    v_message := 'A booking has been cancelled.';
    insert into public.notifications(
      user_id,title,message,notification_type,metadata
    ) values(
      new.user_id,v_title,v_message,'warning',
      jsonb_build_object('booking_id',new.id,'event','booking.cancelled')
    );
    if v_guruba_user_id is not null then
      insert into public.notifications(
        user_id,title,message,notification_type,metadata
      ) values(
        v_guruba_user_id,v_title,v_message,'warning',
        jsonb_build_object('booking_id',new.id,'event','booking.cancelled')
      );
    end if;
  elsif new.status = 'completed' then
    v_title := 'Booking completed';
    v_message := 'Your booking has been marked completed.';
    insert into public.notifications(
      user_id,title,message,notification_type,metadata
    ) values(
      new.user_id,v_title,v_message,'success',
      jsonb_build_object('booking_id',new.id,'event','booking.completed')
    );
  elsif new.status = 'awaiting_client_confirmation' then
    v_title := 'Time confirmation needed';
    v_message := 'The Guruba proposed a new booking time.';
    insert into public.notifications(
      user_id,title,message,notification_type,metadata
    ) values(
      new.user_id,v_title,v_message,'booking',
      jsonb_build_object('booking_id',new.id,'event','booking.time_proposed')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_emit_booking_domain_event on public.bookings;
create trigger trg_emit_booking_domain_event
after insert or update of status, scheduled_at on public.bookings
for each row
execute function public.emit_booking_domain_event();

commit;
