# Purohit Client

New cross-platform Purohit client for Web + iOS + Android.

The legacy Next.js frontend under `src/` is not the implementation source. It is used only as product-flow/reference archaeology; known legacy bugs and brittle implementation patterns are not copied.

## Stack
- Expo + React Native + React Native Web
- Expo Router
- TanStack Query
- Supabase Auth + server-authoritative RPC/read projections

## Environment

Copy `.env.example` to `.env.local` for local development.

### Public client configuration
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are intentionally public client values. The anon/publishable key is safe to ship to Web/iOS/Android; authorization must remain enforced by Supabase RLS/RPCs.

The current Purohit Supabase project is:
- URL: `https://axctxzjqnxbloxakhhmx.supabase.co`
- project ref: `axctxzjqnxbloxakhhmx`

### Sensitive server/CI configuration
Never put these in the Expo client bundle or prefix them with `EXPO_PUBLIC_`:
- `SUPABASE_DB_URL` — GitHub Actions backend contract tests
- `EXPO_TOKEN` — GitHub Actions EAS cloud builds
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Edge Functions/server-side privileged operations

There are currently no privileged service-role credentials hardcoded in the Purohit client.

## Local
```bash
npm install
npm run typecheck
npm run web
```

## Web
```bash
npm run export:web
```

The standalone Cloudflare Pages project is configured separately from the legacy production Pages project.

## Native
EAS profiles live in `eas.json`:
- development: internal development client
- preview: internal distribution
- production: store build

Local native prebuild:
```bash
npm run prebuild
```

GitHub Actions also runs native preflight plus Android release APK and iOS Simulator Release compilation.

EAS cloud builds are conditional on the `EXPO_TOKEN` GitHub secret. Store identifiers/credentials must be supplied before submitting production binaries.
