-- Complete the message-read API surface.
create or replace function public.mark_all_messages_read_from_sender(p_sender_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_count integer;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_sender_id is null or p_sender_id=v_uid then raise exception 'Invalid sender'; end if;
  update public.messages
  set is_read=true,seen_at=coalesce(seen_at,now()),read_at=coalesce(read_at,now())
  where receiver_id=v_uid and sender_id=p_sender_id and is_read=false;
  get diagnostics v_count=row_count;
  return v_count;
end; $$;
grant execute on function public.mark_all_messages_read_from_sender(uuid) to authenticated;
