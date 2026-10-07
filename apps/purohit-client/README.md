# Purohit Client

New cross-platform Purohit client for Web + iOS + Android.

This application is intentionally independent from the legacy Next.js frontend under `src/`. The legacy frontend is not the implementation source.

## Local

```bash
npm install
npm run typecheck
npm run web
```

## Architecture

- Expo + React Native + React Native Web
- shared TypeScript domain/data/hooks/UI
- Supabase Auth and RPC/read-projection boundary
- no privileged/service-role credentials
- platform adapters only where native/web behavior differs
