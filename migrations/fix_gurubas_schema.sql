-- Fix missing columns in gurubas table and insert missing record
DO $$
BEGIN
  -- 1. Add 'is_verified' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'is_verified') THEN
    ALTER TABLE public.gurubas ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- 2. Add 'guruba_type' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'guruba_type') THEN
    ALTER TABLE public.gurubas ADD COLUMN guruba_type text DEFAULT 'brahmin';
  END IF;

  -- 3. Add 'languages' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'languages') THEN
    ALTER TABLE public.gurubas ADD COLUMN languages text[] DEFAULT '{}';
  END IF;

  -- 4. Add 'specialties' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'specialties') THEN
    ALTER TABLE public.gurubas ADD COLUMN specialties text[] DEFAULT '{}';
  END IF;

  -- 5. Add 'rating' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'rating') THEN
    ALTER TABLE public.gurubas ADD COLUMN rating numeric(2,1) DEFAULT 5.0;
  END IF;

  -- 6. Add 'years_experience' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'years_experience') THEN
    ALTER TABLE public.gurubas ADD COLUMN years_experience integer DEFAULT 0;
  END IF;

  -- 7. Add 'bio' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'bio') THEN
    ALTER TABLE public.gurubas ADD COLUMN bio text;
  END IF;

  -- 8. Add 'location' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'location') THEN
    ALTER TABLE public.gurubas ADD COLUMN location text;
  END IF;

   -- 9. Add 'verification_requested_at' if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'verification_requested_at') THEN
    ALTER TABLE public.gurubas ADD COLUMN verification_requested_at timestamptz;
  END IF;

END $$;

-- Now safe to insert the missing record
INSERT INTO public.gurubas (user_id, bio, years_experience, rating, location, specialties, is_verified, guruba_type, languages)
SELECT 
  id, 
  'Experienced Guruba', 
  5, 
  5.0, 
  'Kathmandu', 
  ARRAY['General'], 
  false, 
  'brahmin', 
  ARRAY['Nepali', 'Sanskrit']
FROM public.profiles 
WHERE role = 'guruba' 
AND id NOT IN (SELECT user_id FROM public.gurubas);
