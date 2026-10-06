# GurubyAI Backend Roadmap — B0 to B11

Repository: `iamgrisma/gurubyai`

## Completion order

This is a backend-first rebuild. Do not start B10/B11 until B0-B9 are closed.

### B0 — Full backend audit
Inventory schema, RPCs, grants, RLS, triggers, reads/writes, frontend coupling, migrations, deployment configuration and operational gaps.

### B1 — Domain/schema foundation
Close schema type debt and establish relational invariants:
- canonical Gotra UUID relation on `profiles.gotra_id`
- integer/nonnegative `gurubas.review_count`
- required FK/indexes/constraints
- eliminate legacy type ambiguity before API contract freeze

### B2 — Security/RLS
Reduce public surface and consolidate permissive policies by domain/role. Verify:
- no direct client financial writes
- no direct client booking state transitions
- ownership checks
- admin-only operations
- internal tables/functions unavailable to clients

### B3 — Core domain API
All client mutations through authoritative RPCs. Reads progressively move to explicit projections/views.

### B4 — Booking engine
Implement and test:
- complete state machine
- slot/overlap invariants
- rescheduling
- cancellation rules
- refunds
- idempotency keys
- duplicate-submit/race protection
- transaction-safe availability recheck
- notification-producing domain events

### B5 — Money/wallet/ledger
Make `credits` plus ledger authoritative:
- append-only transaction semantics
- idempotent top-up/charge/refund
- atomic balance/ledger invariants
- reconciliation
- remove client contract dependence on legacy `balance`
- audit all financial RPCs/triggers

### B6 — Location
Production hardening for geocoding/routing:
- provider abstraction
- rate limiting
- timeout/error handling
- privacy boundaries
- Nepal timezone semantics
- avoid depending on public-provider SLAs for core booking correctness

### B7 — Notifications/events/messages
Implement durable domain events and delivery workflow:
- in-app notifications
- message events
- retry/idempotency
- read-state operations
- delivery preferences
- internal job queue boundaries

### B8 — OpenAPI
Freeze a machine-readable API contract matching the authoritative domain operations. Include auth, errors, pagination, idempotency and schemas.

### B9 — Backend tests
Automated authorization/integration/race tests covering:
- RLS leakage
- role escalation
- ownership bypass
- booking transitions
- availability races
- wallet invariants
- refunds
- idempotency
- event/notification side effects

### B10 — Production web
Only after B0-B9. Web is a presentation client of the backend contract.

### B11 — Android/Expo
Only after B0-B9. Mobile uses the same backend/API contract as web.

## Current rule

Never mark a phase complete from documentation alone. A phase is complete only after:
1. repository implementation exists;
2. production migration/deployment state is verified where applicable;
3. relevant tests or smoke checks pass;
4. dependent clients are aligned;
5. docs reflect the verified state.

## Current known baseline

Existing work already provides substantial B0-B3 implementation, including booking RPC hardening, core mutation RPCs, message read RPCs, direct booking-write revocation, and location flow. The B1 normalization migration has now been committed to the repository and must still be applied and verified in the production database before B1 can be marked complete.

## Backend definition of done

Backend is complete only when B0-B9 are closed. B10 and B11 are then client implementations against the frozen backend contract, not places to compensate for missing backend rules.
