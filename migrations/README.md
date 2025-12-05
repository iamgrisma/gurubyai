# GuruByAI Database Migrations

This folder contains the consolidated SQL schema and seed data for the GuruByAI application.

## Files

### 1. sqlsetup.sql (54KB)
Complete database schema setup including:
- **Extensions**: UUID support
- **15+ Tables**: All core tables with proper constraints
- **Row Level Security (RLS)**: Policies for all tables
- **Indexes**: Performance optimization indexes
- **Functions**: 20+ RPC functions for business logic
- **Triggers**: Automatic data handling
- **Views**: Conversation management view
- **Security Hardening**: Permission management

### 2. dataseeder.sql (2KB)
Initial seed data including:
- **Common Gotras**: 8 pre-approved gotras
- **Default Services**: 10 sample service offerings

## How to Use

### For Supabase

1. **Backup your existing database** (if applicable)
2. Open Supabase SQL Editor
3. Copy and paste the entire content of `sqlsetup.sql`
4. Click "Run" to execute
5. Copy and paste the entire content of `dataseeder.sql`
6. Click "Run" to execute

### Migration Safety

All migrations use non-destructive patterns:
- `CREATE TABLE IF NOT EXISTS` - Won't fail if table exists
- `CREATE OR REPLACE FUNCTION` - Updates function definitions
- `DROP POLICY IF EXISTS` - Safely recreates policies
- `DO $$ BEGIN IF NOT EXISTS...` - Conditional column additions
- `ON CONFLICT DO NOTHING` - Prevents duplicate seed data

### Verification Checklist

After running the migrations, verify:

✓ All tables exist in `public` schema  
✓ RLS is enabled on all tables  
✓ Policies are attached to tables  
✓ Functions appear in Database > Functions  
✓ Sample services and gotras are seeded  
✓ User signup/login works  
✓ Booking flow works  
✓ Messaging works  
✓ Admin functions work  

## Content Organization

### Tables by Category

**Core User Management**
- profiles
- gurubas
- guruba_services
- guruba_availability

**Service Management**
- services
- custom_services
- booking_services

**Booking System**
- bookings
- reviews

**Communication**
- messages
- notifications
- conversations (view)

**Finance**
- transactions
- topup_requests

**Supporting**
- gotras
- saved_locations
- job_queue

### RPC Functions

**Booking**: `book_service`  
**Custom Services**: `create_custom_service_request`, `approve_custom_service`, `reject_custom_service`  
**Messaging**: `send_message`, `mark_message_read`, `mark_all_messages_read`, `create_booking_message`  
**Notifications**: `create_notification`, `mark_notification_read`  
**Topup**: `approve_topup_request`, `reject_topup_request`  
**Admin**: `admin_add_credits`, `request_verification`  
**Helpers**: `is_admin`, `cleanup_expired_custom_services`  

## Replaced Files

These scattered SQL files have been consolidated:
- `sql.txt` → Main schema consolidated
- `enhanced_booking_migration.sql` → Merged into booking system section
- `messaging_system_migration.sql` → Merged into communication section
- `add_credits_column.sql` → Merged into profiles table
- `create_notification_rpc.sql` → Included in RPC functions
- `fix_book_service_rpc.sql` → Included in RPC functions
- `fix_topup_rpc.sql` → Included in RPC functions

**DO NOT DELETE** old files until you've successfully tested the new migrations!
