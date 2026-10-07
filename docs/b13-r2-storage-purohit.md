# B13: Cloudflare R2 Storage Architecture (`purohit` Bucket)

## Overview
Media assets (profile avatars, Guruba identity verification documents, and chat attachments) are stored in Cloudflare R2 object storage under the `purohit` bucket.

## Architecture
- **Worker Service**: `services/cf-backend/` bound to R2 bucket `purohit` (`PUROHIT_STORAGE`).
- **CDN / Delivery**: Zero-egress Cloudflare edge network caching with immutable cache-control headers (`Cache-Control: public, max-age=31536000, immutable`).
- **Database Ledger**: Supabase table `public.media_assets` tracks all uploaded keys, content types, categories, and full public URLs.
- **Avatar Automation**: Registering an asset with category `'avatar'` automatically syncs `public.profiles.avatar_url`.

## API Endpoints
- `POST /api/storage/upload`: Multipart or binary stream upload (max 15MB, validates MIME types).
- `GET /api/storage/file/:key`: High-performance cached edge delivery.
- `DELETE /api/storage/file/:key`: Storage object removal.

## Storage Categories
1. `avatar`: User and Guruba profile pictures.
2. `verification_doc`: Guruba identity documents and certificates.
3. `chat_attachment`: Consultation photos and ritual document attachments.
4. `service_cover`: Visual covers for rituals and services.
