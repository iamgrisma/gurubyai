# Purohit Client

Cross-platform client foundation for Purohit Web + iOS + Android.

## Architecture

- React Native + Expo + React Native Web
- Shared TypeScript domain/data/auth layer
- Supabase client uses only public client credentials
- Business rules remain in the backend/RPC boundary
- Web-specific SEO/public rendering remains a separate concern from native UI

## Workstreams

- B10: Web client
- B11: iOS + Android client

This app is intentionally separate from the legacy Next.js UI under `src/app` and `src/features`.
