# Booking API Contract v1

Authoritative booking operations:
- `book_service`: create a booking and atomically charge the booking fee.
- `get_available_booking_slots`: advisory availability query; final booking is rechecked transactionally.
- `confirm_booking`: Guruba/admin confirmation.
- `propose_booking_time`: Guruba/admin custom-time proposal.
- `respond_booking_time`: client accepts or rejects a proposed time.
- `cancel_booking`: client, assigned Guruba, or admin cancellation.
- `complete_booking`: assigned Guruba/admin completion after scheduled time.

Clients must never update `bookings.status`, `scheduled_at`, `proposed_time`, `platform_fee`, ownership, or assignment directly.
New web and mobile clients will call these domain operations rather than writing booking rows.

Status transitions:
`pending -> confirmed`
`pending -> awaiting_client_confirmation`
`awaiting_client_confirmation -> confirmed`
`awaiting_client_confirmation -> cancelled`
`pending -> cancelled`
`confirmed -> completed`
`confirmed -> cancelled`