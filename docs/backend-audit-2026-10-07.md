# Backend Audit — 2026-10-07

## Findings

### Critical
- `bookings` had client-facing INSERT/UPDATE grants. RLS limited rows but did not make the booking state machine authoritative. A client could attempt direct row mutations instead of using the hardened booking RPC.
- Legacy `create_booking_payment` and `top_up_wallet` were callable by authenticated clients and are not safe as client APIs. They have now been revoked from client roles.
- `bookings` status changes were exposed through generic UPDATE policies. Controlled booking domain RPCs now exist and direct client booking writes are revoked.

### High
- Multiple permissive RLS policies exist on several tables. They are not automatically equivalent to a vulnerability, but they make authorization harder to reason about and will be consolidated during the API-first rebuild.
- `profiles` contains private fields such as email and phone. The new client contract will not expose the full profile row as a public object.
- `balance` and `credits` are both present. `credits` is currently the canonical booking-fee wallet; the legacy balance path is being retired from the client contract.

### Medium
- Five SECURITY DEFINER functions still have mutable search_path warnings. They must be pinned or moved behind the final API boundary.
- `job_queue` has RLS enabled with no policies. It should remain internal and be removed from client API exposure.
- Public GraphQL/Data API exposure is broader than the final product contract. The rebuild will use explicit grants and a dedicated API surface.

## Implemented so far
- Backend security baseline migration applied to production.
- Positive/validity constraints added for top-ups, balances, services, availability ranges, and saved-location coordinates.
- Legacy financial RPC execution revoked for `anon` and `authenticated`.
- Booking domain state-machine RPCs added.
- Direct client INSERT/UPDATE/DELETE on `bookings` and `booking_services` revoked.
- Backend architecture and booking API contract documented in docs/.
- Core API mutation boundary completed: protected domain tables have no authenticated INSERT/UPDATE/DELETE privileges.
- Profile, Guruba profile/service, wallet top-up, saved locations, Gotra requests/admin, messaging, reviews, service catalog, verification and booking operations now use server-authoritative RPCs.
- Admin concierge availability now uses the same server availability RPC as the client booking flow.
- Message read operations were aligned with the deployed read RPCs.

## Remaining after B3
1. Replace broad direct-table reads with intentional API projections/views.
2. Consolidate RLS policies by domain and role.
3. Finish booking policy edge cases: rescheduling, refund/cancellation policy, and idempotency.
4. Formalize wallet/transaction ledger and remove the legacy balance model.
5. Add OpenAPI contract and automated authorization/integration tests.
6. Then rebuild Web (B10) and Android/Expo (B11).