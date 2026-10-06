# Core API Layer v1 (B3)

B3 is complete when application clients use server-authoritative domain operations for every supported mutation in the current product surface.

## Contract rules

- Clients never write protected domain tables directly.
- PostgreSQL RPCs validate actor, ownership/role, input, and state.
- RPCs are SECURITY DEFINER with pinned search_path.
- Authenticated table mutation privileges are revoked for protected domains.
- Reads remain RLS-governed and can use direct Supabase queries where appropriate.
- Booking state, price, wallet credits, availability, verification and review eligibility are server-authoritative.

## Client-facing operations

### Identity/profile
- update_my_profile
- upsert_my_guruba_profile

Editable profile fields are explicit; role, credits, email and creation metadata are never client-controlled.

### Locations
- save_my_location
- delete_my_location

The backend enforces ownership, coordinate ranges and the five-location limit.

### Wallet
- request_topup

The backend enforces positive amount, upper bound and duplicate pending-request throttling. Approval/rejection remains admin-only RPC.

### Messaging
- send_message
- mark_messages_read

Message sending validates the receiver and, when a booking is supplied, both parties are participants in that booking. System messages cannot be forged through the client message API.

### Guruba services/profile
- upsert_my_guruba_profile
- set_my_guruba_service

Only the authenticated Guruba owner can mutate their own Guruba profile/service offering.

### Reviews
- create_review

Only the client who owns a completed booking may review it, and each booking can be reviewed once.

### Gotras
- request_gotra
- admin_manage_gotra

Users can request a Gotra; only admins can approve/reject/admin-create entries.

### Admin catalog/verification
- admin_upsert_service
- admin_delete_service
- admin_set_guruba_verification
- admin_create_booking

All admin operations verify the authenticated admin role in the database.

### Booking domain
See docs/booking-api-v1.md:
- book_service
- get_available_booking_slots
- confirm_booking
- propose_booking_time
- respond_booking_time
- cancel_booking
- complete_booking
- set_booking_meeting_link
- admin_create_booking

## Database boundary

Authenticated users have no INSERT/UPDATE/DELETE table privileges on:
profiles, gurubas, services, guruba_services, topup_requests, messages, saved_locations, gotras, reviews.

This prevents a new frontend (web or mobile) from accidentally bypassing the domain rules.

## Availability

Admin concierge availability now uses the same get_available_booking_slots operation as the booking flow. The UI no longer reconstructs availability from raw weekly hours.

## Implementation

- Migration: migrations/20_core_domain_api_boundary.sql
- Migration: migrations/21_core_catalog_and_review_api.sql
- Web client mutations migrated to the RPC contract.
- B8 will turn this stable operation inventory into the machine-readable OpenAPI contract.
