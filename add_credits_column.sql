-- Add credits column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits integer DEFAULT 100;
    
    -- Update existing users to have default credits
    UPDATE public.profiles SET credits = 100 WHERE credits IS NULL;
  END IF;
END $$;
