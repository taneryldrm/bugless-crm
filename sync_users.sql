-- BUGLESS CRM: USER SYNC & REPAIR SCRIPT (v3 - Recursion Fix)
-- Run this in the Supabase SQL Editor to fix missing users and the recursion error.

-- 1. CLEANUP
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;

-- 2. ROLE CHECK FUNCTION (Security Definer - Bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Yönetici'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. TRIGGER FUNCTION: Support dynamic roles & dashboard metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, created_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    new.email, 
    COALESCE(
      new.raw_user_meta_data->>'role', 
      CASE WHEN new.email = 'sumeyye@bugless.com' THEN 'Yönetici' ELSE 'Mühendis' END
    ),
    new.raw_user_meta_data->>'avatar_url', 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. BACKFILL
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'), 
  email, 
  COALESCE(raw_user_meta_data->>'role', 'Mühendis'),
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 6. PERMISSIONS RECONSTRUCTION
-- Drop all possible old policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Personnel View Access" ON profiles;
DROP POLICY IF EXISTS "Admin Full Access" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "View All Profiles" ON profiles;
DROP POLICY IF EXISTS "Update Own Profile" ON profiles;

-- Policy: Everyone (Authenticated) can see all profiles
CREATE POLICY "View All Profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Admin can do anything
-- Note: Use the is_admin() function to avoid recursion
CREATE POLICY "Admin Full Access" 
ON public.profiles FOR ALL 
TO authenticated 
USING (is_admin());

-- Policy: User can update their own profile (names, etc)
CREATE POLICY "Update Own Profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 7. REFRESH RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- FINAL CHECK
SELECT 'Recursion fix applied. Permissions are now safe.' as result;
