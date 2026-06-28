-- Add is_online column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
