-- ==========================================
-- GURUBYAI DATA SEEDER
-- Initial seed data for the application
-- ==========================================
-- Run this file AFTER sqlsetup.sql

-- ==========================================
-- 1. SEED COMMON GOTRAS
-- ==========================================

INSERT INTO public.gotras (name, status) VALUES
  ('Bharadwaj', 'approved'),
  ('Kashyap', 'approved'),
  ('Gautam', 'approved'),
  ('Vatsa', 'approved'),
  ('Sandilya', 'approved'),
  ('Kaushal', 'approved'),
  ('Atreya', 'approved'),
  ('Vishwamitra', 'approved')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 2. SEED DEFAULT SERVICES
-- ==========================================

INSERT INTO public.services (title, description, duration_minutes, base_price, category, is_featured, is_online_enabled) VALUES
  ('Traditional Puja', 'Complete traditional puja ceremony with mantras and rituals', 90, 20, 'Religious', true, false),
  ('Graha Shanti Puja', 'Special puja to pacify planets and remove obstacles', 120, 30, 'Religious', true, false),
  ('Marriage Ceremony', 'Traditional Hindu marriage ceremony with all rituals', 240, 100, 'Life Events', true, false),
  ('House Warming (Griha Pravesh)', 'Blessing ceremony for new home', 60, 15, 'Life Events', false, false),
  ('Astrological Consultation', 'Personal horoscope reading and consultation', 45, 10, 'Consultation', true, true),
  ('Name Ceremony (Naamkaran)', 'Traditional naming ceremony for newborns', 60, 15, 'Life Events', false, false),
  ('Satyanarayan Puja', 'Worship of Lord Satyanarayan for prosperity', 90, 18, 'Religious', false, false),
  ('Rudra Abhishek', 'Special abhishek for Lord Shiva', 75, 20, 'Religious', false, false),
  ('Pitri Paksha Puja', 'Ancestral worship ceremony', 60, 12, 'Religious', false, false),
  ('Online Puja Guidance', 'Remote guidance for performing puja at home', 30, 8, 'Consultation', false, true)
ON CONFLICT (title) DO NOTHING;

-- End of data seeding
