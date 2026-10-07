# Purohit Client

New cross-platform Purohit client for Web + iOS + Android.

The legacy Next.js frontend under `src/` is not the implementation source.

## Stack
- Expo + React Native + React Native Web
- Expo Router
- TanStack Query
- Supabase Auth + server-authoritative RPC/read projections

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

Store identifiers/credentials must be supplied before submitting production binaries.