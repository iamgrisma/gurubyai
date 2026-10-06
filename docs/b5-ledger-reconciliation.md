# B5 Ledger Reconciliation Gate

Before B5 is marked complete, reconcile every profile credit balance against transactions.

Required:
- identify legacy balances without transaction history
- create explicit opening-balance entries where needed
- verify booking fees and refunds are one-to-one by reference_key
- verify top-up approvals are idempotent
- reject negative balances
- run reconciliation against production data after migrations are applied

Production reconciliation is still pending while the Supabase connector is unavailable.
