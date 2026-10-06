create index if not exists idx_booking_services_custom_service_id on public.booking_services(custom_service_id);
create index if not exists idx_booking_services_service_id on public.booking_services(service_id);
create index if not exists idx_custom_services_approved_by on public.custom_services(approved_by);
create index if not exists idx_messages_booking_id on public.messages(booking_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_saved_locations_user_id on public.saved_locations(user_id);
create index if not exists idx_topup_requests_user_id on public.topup_requests(user_id);