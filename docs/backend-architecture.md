# Gurubyai Backend Architecture

## Goal
The backend is the product contract. Web and mobile clients must not encode booking, pricing, authorization, wallet, or availability rules themselves.

## Canonical stack
- PostgreSQL/Supabase: persistence, constraints, RLS, transactions.
- Supabase Auth: identity/JWT.
- Domain RPCs/API layer: authoritative business operations.
- Next.js web client: presentation only.
- React Native/Expo mobile client: presentation only.
- A standalone Go HTTP API may be introduced later without changing the domain model.

## Non-negotiable rules
1. Never trust client-supplied price, fee, status, role, ownership, availability, or booking state.
2. Booking creation is server-authoritative and transactional.
3. Slot availability is advisory until the final booking transaction locks/rechecks it.
4. Financial mutations are server-authoritative and auditable.
5. Clients must not directly update financial fields.
6. Clients must not directly transition booking status once the API-first contract is active.
7. Every privileged operation must verify the authenticated actor and target ownership/role.
8. Public read operations and private user operations must have separate authorization semantics.
9. API responses should expose domain data, not database implementation details.
10. Web and mobile consume the same contract.

## Core domain
profiles, gurubas, services, guruba_services, guruba_availability, bookings, booking_services, custom_services, saved_locations, transactions, topup_requests, notifications, messages, reviews, gotras.

## Booking lifecycle
Normal: pending -> confirmed -> completed.
Custom-time negotiation: pending -> awaiting_client_confirmation -> confirmed.
Cancellation: pending/confirmed/awaiting_client_confirmation -> cancelled when the transition is permitted.
The final API will enforce legal transitions server-side.

## Financial model
`credits` is the canonical booking-fee wallet for the current product.
Legacy `balance`, `create_booking_payment`, and `top_up_wallet` are not part of the new client contract.
Top-ups use: topup_requests -> admin approval -> credits + transaction ledger.
Booking fees use: book_service -> atomic credit deduction + transaction ledger + booking.

## API contract direction
/auth, /profile, /services, /gurubas, /availability, /bookings, /locations, /wallet, /notifications, /messages, /reviews.
The machine-readable OpenAPI contract will be added after the domain RPCs and authorization rules are stabilized.

## Rebuild strategy
1. schema and invariants
2. authorization
3. booking state machine
4. availability engine
5. financial ledger
6. notifications/messages
7. API contract/OpenAPI
8. backend tests
9. new web client
10. mobile client

The current frontend is temporary reference material, not the source of truth.