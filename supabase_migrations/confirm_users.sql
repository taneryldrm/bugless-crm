-- Supabase Dashboard > Authentication > Settings > Email Auth
-- Run this to disable email confirmation requirement

-- 1. Go to: https://qulzeoytobflgktbtogg.supabase.co/project/_/auth/providers
-- 2. Find "Email" provider
-- 3. Turn OFF "Confirm email"
-- 4. Click Save

-- OR manually confirm the admin user:
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'admin@bugless.com';

-- Also confirm Sümeyye Şencan if needed:
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%sümeyye%' OR email LIKE '%sencan%';
