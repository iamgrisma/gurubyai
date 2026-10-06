-- Secure message read-state mutation behind a narrow RPC.
create or replace function public.mark_messages_read(p_message_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Unauthorized'; end if;
  update public.messages
  set is_read = true,
      seen_at = coalesce(seen_at, now()),
      read_at = coalesce(read_at, now())
  where id = any(p_message_ids)
    and receiver_id = (select auth.uid())
    and is_read = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke execute on function public.mark_messages_read(uuid[]) from public, anon;
grant execute on function public.mark_messages_read(uuid[]) to authenticated;
revoke update on public.messages from authenticated;
