-- B9 authenticated integration/security tests.
-- Runs as a privileged DB connection but simulates a real Supabase authenticated request.
begin;

do $$
declare
  v_user uuid;
  v_booking uuid;
  v_other_user uuid;
  v_rows integer;
  v_ref text;
  v_ref_rows integer;
  v_status text;
begin
  select p.id into v_user from public.profiles p
  where coalesce(p.role,'client') <> 'admin' order by p.id limit 1;

  select b.id, b.user_id into v_booking, v_other_user
  from public.bookings b join public.profiles p on p.id=b.user_id
  where coalesce(p.role,'client') <> 'admin'
    and b.status in ('pending','confirmed','awaiting_client_confirmation')
    and coalesce(b.platform_fee,0) > 0
  order by b.created_at desc limit 1;

  if v_user is null then raise exception 'B9 authenticated integration: no client fixture available'; end if;
  if v_booking is null then raise exception 'B9 refund integration: no cancellable fee-bearing booking fixture available'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user::text)::text, true);

  if auth.uid() <> v_user then raise exception 'B9 auth simulation failed: auth.uid mismatch'; end if;

  select count(*) into v_rows from public.profiles;
  if v_rows <> 1 then raise exception 'B9 profile isolation failed: expected 1 visible profile, got %',v_rows; end if;

  begin
    perform public.admin_add_credits(v_user,1);
    raise exception 'B9 authorization failed: non-admin admin_add_credits succeeded';
  exception when others then
    if sqlerrm like 'B9 authorization failed:%' then raise; end if;
  end;

  begin
    perform public.book_service_idempotent(
      coalesce(v_other_user,'00000000-0000-0000-0000-000000000000'::uuid),
      null,null,now()+interval '2 days',0,null,null,null,null,null,false,false,
      'b9-auth-negative-12345'
    );
    raise exception 'B9 authorization failed: cross-user booking idempotency was accepted';
  exception when others then
    if sqlerrm like 'B9 authorization failed:%' then raise; end if;
  end;

  perform public.cancel_booking(v_booking);

  select b.status into v_status from public.bookings b where b.id=v_booking;
  if v_status <> 'cancelled' then raise exception 'B9 refund integration failed: booking was not cancelled'; end if;

  v_ref := 'booking-refund:'||v_booking::text;
  select count(*) into v_ref_rows
  from public.transactions
  where reference_key=v_ref and user_id=v_other_user and type='credit' and status='completed';

  if v_ref_rows <> 1 then raise exception 'B9 refund integration failed: expected one refund ledger entry, got %',v_ref_rows; end if;
end $$;

rollback;
raise notice 'B9 authenticated integration, authorization and refund tests passed';
