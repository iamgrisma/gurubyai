-- Approve verification for guru@grisma.com.np
UPDATE public.gurubas
SET is_verified = true
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'guru@grisma.com.np');
