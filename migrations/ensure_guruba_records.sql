-- Ensure all users with role 'guruba' have a corresponding record in the 'gurubas' table
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

-- Also ensure the verification_requested_at column exists (redundant check but safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gurubas' AND column_name = 'verification_requested_at') THEN
    ALTER TABLE public.gurubas ADD COLUMN verification_requested_at timestamptz;
  END IF;
END $$;
