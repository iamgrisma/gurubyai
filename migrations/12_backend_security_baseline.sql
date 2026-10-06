-- Backend security baseline for the API-first rebuild.
-- Legacy client-callable financial paths are removed.

revoke execute on function public.create_booking_payment(uuid, uuid, uuid, timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.top_up_wallet(uuid, integer) from public, anon, authenticated;
revoke execute on function public.approve_topup_request(uuid) from public, anon;
revoke execute on function public.reject_topup_request(uuid) from public, anon;

alter function public.approve_topup_request(uuid) set search_path = public;
alter function public.reject_topup_request(uuid) set search_path = public;

alter table public.topup_requests add constraint topup_requests_amount_positive check (amount > 0);
alter table public.profiles add constraint profiles_credits_nonnegative check (coalesce(credits, 0) >= 0);
alter table public.profiles add constraint profiles_balance_nonnegative check (coalesce(balance, 0) >= 0);
alter table public.services add constraint services_duration_nonnegative check (duration_minutes is null or duration_minutes >= 0);
alter table public.services add constraint services_base_price_nonnegative check (base_price is null or base_price >= 0);
alter table public.guruba_availability add constraint guruba_availability_valid_range check (end_time > start_time);
alter table public.saved_locations add constraint saved_locations_latitude_valid check (latitude between -90 and 90);
alter table public.saved_locations add constraint saved_locations_longitude_valid check (longitude between -180 and 180);