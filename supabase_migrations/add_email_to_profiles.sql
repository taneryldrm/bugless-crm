-- MIGRATION: Add email column to profiles table
-- Run this in Supabase SQL Editor

-- 1. Add email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Update trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, created_at)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,  -- Add email from auth.users
    new.raw_user_meta_data->>'avatar_url', 
    'Mühendis',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing users (optional but recommended)
-- This updates existing profiles with their emails from auth.users
UPDATE public.profiles 
SET email = auth.users.email 
FROM auth.users 
WHERE profiles.id = auth.users.id 
  AND profiles.email IS NULL;
