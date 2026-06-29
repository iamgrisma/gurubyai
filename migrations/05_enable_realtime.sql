-- 05_enable_realtime.sql
-- Enable Realtime for messages, bookings, and notifications tables

-- Drop the publication if it exists to recreate it, or just add the tables.
-- The default realtime publication in Supabase is supabase_realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
