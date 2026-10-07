# B12: Rewarded Ads & Reward Points Monetization Architecture

## Overview
Direct cash top-ups and off-platform payments have been decommissioned. Instead, GuruByAI/Purohit operates on a **virtual reward points model** powered by rewarded video ads (Google AdMob / Unity Ads) and engagement bonuses.

## Why this solves App Store & Google Play compliance
1. **Apple App Store Guideline 3.1.1 Exemption**: Under Apple Developer rules, rewarded video ads that award virtual in-app points do *not* require In-App Purchase (StoreKit) because the user is never charged real fiat currency. Apple takes no 30% cut on ad impressions.
2. **Nepali Payment Gateways Eliminated**: Eliminates the legal, KYC, and technical maintenance overhead of integrating and maintaining eSewa, Khalti, or ConnectIPS gateway webhooks.
3. **Accessibility**: Every Nepali user with a smartphone can access spiritual services without requiring a linked digital wallet or bank account.

## Reward Rates & Rules
- **Rewarded Video Ad**: 20 reward points per completed ad.
- **Daily Check-In**: 50 reward points per calendar day.
- **Offer Wall / Bonus**: 50 reward points.
- **Daily Cap**: 25 rewarded ads per user per day in `Asia/Kathmandu` timezone (max 500 points/day from ads).
- **Anti-Farming Cooldown**: 20 seconds between consecutive ad reward claims.
- **Idempotency**: Client supplies a unique idempotency key per claim; duplicate requests return cached results safely without double-crediting.

## Database Contracts
- Table: `public.ad_reward_events`
- RPC: `public.claim_ad_reward(p_reward_type, p_idempotency_key, p_ad_placement)` (authenticated)
- RPC: `public.get_ad_reward_status()` (authenticated)
- Ledger: Transactions table tracks all ad rewards with type `'credit'` and reference key `ad_reward:<user_id>:<idempotency_key>`.
